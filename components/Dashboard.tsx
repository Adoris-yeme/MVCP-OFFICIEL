import React, { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
// FIX: Reverted namespace import to named imports to resolve module resolution errors.
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { User, Report, UserRole, Cell as CellType, CellStatus } from '../types.ts';
// FIX: Import getLocalStorageItem from services/api.ts to resolve compilation error.
import { api, getLocalStorageItem } from '../services/api.ts';
import { UsersIcon, ChartBarIcon, CheckCircleIcon, FileDownloadIcon, SpinnerIcon, AlertTriangleIcon, RefreshIcon, TrashIcon, DocumentTextIcon, LogoIcon, StarIcon } from './icons.tsx';
import ReportDetailModal from './ReportDetailModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { REGIONS } from '../constants.ts';

const ITEMS_PER_PAGE = 10;
const getInitialDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
    };
};


// --- HELPERS & SUB-COMPONENTS ---
type TrendStatus = 'growth' | 'stagnation' | 'decline' | 'neutral';
type TrendData = { change: number | null; status: TrendStatus };

const calculateTrend = (reports: Report[], weeks: number = 8, groupBy: keyof Report | null = 'region'): { [key: string]: TrendData } => {
    const now = new Date();
    const trendData: { [key: string]: TrendData } = {};

    const reportsInPeriod = reports.filter(r => {
        const reportDate = new Date(r.cellDate);
        const diffDays = (now.getTime() - reportDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= weeks * 7;
    });

    const weeklyData: { [groupKey: string]: { [week: number]: number[] } } = {};

    reportsInPeriod.forEach(r => {
        if (!groupBy || !r[groupBy]) return;
        const groupKey = String(r[groupBy]);
        const reportDate = new Date(r.cellDate);
        const diffDays = Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 3600 * 24));
        const weekNumber = Math.floor(diffDays / 7);

        if (!weeklyData[groupKey]) weeklyData[groupKey] = {};
        if (!weeklyData[groupKey][weekNumber]) weeklyData[groupKey][weekNumber] = [];
        weeklyData[groupKey][weekNumber].push(r.totalPresent);
    });

    for (const groupKey in weeklyData) {
        const recentPeriodWeeks = weeks / 2;
        let recentTotal = 0;
        let previousTotal = 0;
        let recentWeekCount = 0;
        let previousWeekCount = 0;

        for (let i = 0; i < weeks; i++) {
            const weeklyAvg = weeklyData[groupKey][i] ? weeklyData[groupKey][i].reduce((a, b) => a + b, 0) / weeklyData[groupKey][i].length : 0;
            if (i < recentPeriodWeeks) {
                recentTotal += weeklyAvg;
                if (weeklyData[groupKey][i]) recentWeekCount++;
            } else {
                previousTotal += weeklyAvg;
                 if (weeklyData[groupKey][i]) previousWeekCount++;
            }
        }
        
        const recentAvg = recentWeekCount > 0 ? recentTotal / recentWeekCount : 0;
        const previousAvg = previousWeekCount > 0 ? previousTotal / previousWeekCount : 0;

        let change: number | null = null;
        let status: TrendStatus = 'neutral';

        if (previousAvg > 0) {
            change = ((recentAvg - previousAvg) / previousAvg) * 100;
            if (change > 5) status = 'growth';
            else if (change < -5) status = 'decline';
            else status = 'stagnation';
        } else if (recentAvg > 0) {
            change = 100;
            status = 'growth';
        }

        trendData[groupKey] = { change, status };
    }

    return trendData;
};

const TrendBadge: React.FC<{ trend: TrendData | null }> = ({ trend }) => {
    if (!trend || trend.status === 'neutral' || trend.change === null) {
        return <span className="text-gray-400">-</span>;
    }

    const { status, change } = trend;
    const trendIcon = status === 'growth' ? '▲' : status === 'decline' ? '▼' : '–';
    
    const colorClasses = {
        growth: { text: 'text-green-700', bg: 'bg-green-500' },
        stagnation: { text: 'text-orange-700', bg: 'bg-orange-500' },
        decline: { text: 'text-red-700', bg: 'bg-red-500' },
    };

    // Normalize change for bar width. A change of +/-50% will fill the bar.
    const barWidth = Math.min(100, Math.abs(change) * 2);

    return (
        <div className="flex items-center space-x-2" title={`Tendance: ${change.toFixed(1)}%`}>
            <span className={`w-14 text-right font-semibold text-xs tabular-nums ${colorClasses[status].text}`}>
                {trendIcon} {change.toFixed(0)}%
            </span>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${colorClasses[status].bg}`}
                    style={{ width: `${barWidth}%` }}
                ></div>
            </div>
        </div>
    );
};


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void; }> = ({ title, value, icon, onClick }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-transform duration-200' : ''}`} onClick={onClick}>
    <div className="bg-blue-100 p-3 rounded-full">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-white border rounded shadow-lg text-sm">
                <p className="font-bold">Semaine du {label}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.color }}>{`${pld.name}: ${pld.value}`}</p>
                ))}
            </div>
        );
    }
    return null;
};

const Pagination: React.FC<{ currentPage: number, totalItems: number, onPageChange: (page: number) => void }> = ({ currentPage, totalItems, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-4 text-sm">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300">Précédent</button>
            <span>Page {currentPage} sur {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300">Suivant</button>
        </div>
    );
};

const EmptyState: React.FC<{ onReset: () => void }> = ({ onReset }) => (
    <div className="text-center bg-white p-12 rounded-xl shadow-md">
        <ChartBarIcon className="mx-auto h-16 w-16 text-gray-300" />
        <h3 className="mt-4 text-xl font-semibold text-gray-800">Aucune donnée à afficher</h3>
        <p className="mt-2 text-sm text-gray-500">
            Il n'y a aucun rapport pour la période ou le filtre sélectionné.
        </p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <RefreshIcon className="-ml-1 mr-2 h-5 w-5" />
                Réinitialiser les filtres
            </button>
        </div>
    </div>
);

const SummaryTable: React.FC<{ title: string; data: any[]; headers: string[]; }> = ({ title, data, headers }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        {headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-gray-50 font-medium">
                            {Object.values(row).map((val: any, i) => (
                                <td key={i} className={`px-4 py-3 ${i === 0 ? 'text-gray-900' : ''}`}>
                                    {val}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const DEMOGRAPHICS_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD'];

// --- PDF REPORT TEMPLATE ---
interface ReportPDFProps {
    user: User;
    stats: any;
    dateRange: { start: string; end: string };
    regionFilter: string | null;
    summaryData: any[];
    demographicsData: any[];
    title: string;
}

const ReportPDF = forwardRef<HTMLDivElement, ReportPDFProps>(({ user, stats, dateRange, regionFilter, summaryData, demographicsData, title }, ref) => {
    const summaryHeaders = ['Région', 'Rapports', 'Présence Totale', 'Étude Biblique', 'Heure Miracle', 'Culte Dominical'];
    
    return (
        <div ref={ref} className="bg-white p-8" style={{ width: '210mm' }}>
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center space-x-3">
                    <LogoIcon className="h-16 w-16" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Rapport de Synthèse</h1>
                        <p className="text-gray-600">Ministère de Vie Chrétienne Profonde au BENIN</p>
                    </div>
                </div>
                <div className="text-right text-sm">
                    <p>Généré par: <strong>{user.name}</strong></p>
                    <p>Le: {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>

            <div className="my-6">
                <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
                <p className="text-gray-500">Période du {new Date(dateRange.start).toLocaleDateString('fr-FR')} au {new Date(dateRange.end).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center mb-8">
                <div className="bg-gray-100 p-3 rounded-lg"><p className="text-xs text-gray-500">Rapports Soumis</p><p className="text-xl font-bold">{stats.totalReports}</p></div>
                <div className="bg-gray-100 p-3 rounded-lg"><p className="text-xs text-gray-500">Membres Inscrits</p><p className="text-xl font-bold">{stats.totalMembers}</p></div>
                <div className="bg-gray-100 p-3 rounded-lg"><p className="text-xs text-gray-500">Nouveaux Invités</p><p className="text-xl font-bold">{stats.newMembers}</p></div>
                <div className="bg-gray-100 p-3 rounded-lg"><p className="text-xs text-gray-500">Visites Effectuées</p><p className="text-xl font-bold">{stats.totalVisits}</p></div>
            </div>

            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Synthèse de la Participation par Région</h3>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>{summaryHeaders.map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {summaryData.map((row) => (
                            <tr key={row.name} className="bg-white border-b">
                                <td className="px-3 py-2 font-semibold">{row.name}</td>
                                <td className="px-3 py-2">{row.reportsCount}</td>
                                <td className="px-3 py-2">{row.totalPresent}</td>
                                <td className="px-3 py-2">{row.bibleStudy}</td>
                                <td className="px-3 py-2">{row.miracleHour}</td>
                                <td className="px-3 py-2">{row.sundayService}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div>
                 <h3 className="text-lg font-semibold text-gray-700 mb-2">Répartition Démographique</h3>
                 <div className="flex space-x-4">
                    {demographicsData.map(d => (
                        <div key={d.name} className="p-3 bg-blue-50 rounded-lg flex-1 text-center">
                            <p className="text-sm font-semibold text-blue-800">{d.name}</p>
                            <p className="text-2xl font-bold text-blue-900">{d.value}</p>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
});

const MembersByRegionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    data: Array<{ region: string; men: number; women: number; children: number; total: number }>;
}> = ({ isOpen, onClose, data }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Détail des Membres Inscrits par Région</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Région</th>
                                <th className="px-4 py-3 text-center">Hommes</th>
                                <th className="px-4 py-3 text-center">Femmes</th>
                                <th className="px-4 py-3 text-center">Enfants</th>
                                <th className="px-4 py-3 text-center font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row) => (
                                <tr key={row.region} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{row.region}</td>
                                    <td className="px-4 py-3 text-center">{row.men}</td>
                                    <td className="px-4 py-3 text-center">{row.women}</td>
                                    <td className="px-4 py-3 text-center">{row.children}</td>
                                    <td className="px-4 py-3 text-center font-bold text-gray-900">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const DrillDownModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    region: string;
    allReports: Report[];
}> = ({ isOpen, onClose, region, allReports }) => {
    
    const trendAnalysis = useMemo(() => {
        if (!isOpen) return null;

        const regionReports = allReports.filter(r => r.region === region);
        
        const groupTrends = calculateTrend(regionReports, 8, 'group');
        const districtTrends = calculateTrend(regionReports, 8, 'district');
        const cellTrends = calculateTrend(regionReports, 8, 'cellName');
        
        const underperforming = (trends: { [key: string]: TrendData }) => 
            Object.entries(trends)
                .filter(([, data]) => data.status === 'decline' || data.status === 'stagnation')
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));

        return {
            groups: underperforming(groupTrends),
            districts: underperforming(districtTrends),
            cells: underperforming(cellTrends),
        };

    }, [isOpen, region, allReports]);

    if (!isOpen) return null;

    const renderTrendList = (title: string, data: ({ name: string } & TrendData)[]) => {
        if (data.length === 0) return null;
        return (
            <div>
                <h4 className="font-semibold text-gray-800 mb-2">{title}</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {data.map(item => (
                        <li key={item.name} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                            <span className="font-medium text-gray-700">{item.name}</span>
                            <TrendBadge trend={item} />
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Analyse Détaillée: Région {region}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {trendAnalysis ? (
                        <>
                            {renderTrendList("Groupes en difficulté ou stagnation", trendAnalysis.groups)}
                            {renderTrendList("Districts en difficulté ou stagnation", trendAnalysis.districts)}
                            {renderTrendList("Cellules en difficulté ou stagnation", trendAnalysis.cells)}
                            {trendAnalysis.groups.length === 0 && trendAnalysis.districts.length === 0 && trendAnalysis.cells.length === 0 && (
                                <p className="text-center text-gray-600 py-8">Aucune sous-entité en difficulté ou stagnation n'a été identifiée pour cette région sur la période analysée.</p>
                            )}
                        </>
                    ) : (
                         <div className="flex justify-center items-center p-10"><SpinnerIcon className="h-8 w-8" /></div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { showToast } = useToast();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<{ region: string } | null>(null);
  const [featuredTestimonyId, setFeaturedTestimonyId] = useState(() => getLocalStorageItem<string | null>('featured_testimony_id', null));


  const pdfRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const regionFilter = queryParams.get('region');

  const [reportsSearch, setReportsSearch] = useState('');
  const [newMembersSearch, setNewMembersSearch] = useState('');
  const [reportsPage, setReportsPage] = useState(1);
  const [newMembersPage, setNewMembersPage] = useState(1);

  const initialDateRange = useMemo(() => getInitialDateRange(), []);
  
  const [dateRange, setDateRange] = useState(initialDateRange);
  
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedReports = await api.getReports(user, dateRange);
        setReports(fetchedReports);
      } catch (err: any) {
        setError(`Erreur lors de la récupération des rapports. ${err.code === 'failed-precondition' ? 'Un index Firestore est probablement requis. Veuillez vérifier la console Firebase pour créer l\'index manquant.' : err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [user, dateRange]);

  const handleDeleteRequest = (report: Report) => {
    setReportToDelete(report);
    setIsConfirmOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
        await api.deleteReport(reportToDelete.id);
        setReports(prevReports => prevReports.filter(report => report.id !== reportToDelete.id));
        showToast('Rapport supprimé avec succès.', 'success');
        if (selectedReport?.id === reportToDelete.id) {
            setSelectedReport(null);
        }
    } catch (error: any) {
        showToast(`Erreur lors de la suppression du rapport: ${error.message}`, 'error');
        console.error(error);
    } finally {
        setIsDeleting(false);
        setIsConfirmOpen(false);
        setReportToDelete(null);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDateRange(prev => ({...prev, [e.target.name]: e.target.value }));
  };
  
  const handleRegionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRegion = e.target.value;
    setReportsPage(1);
    setNewMembersPage(1);
    if (selectedRegion === 'all') {
        navigate('/admin', { replace: true });
    } else {
        navigate(`/admin?region=${encodeURIComponent(selectedRegion)}`, { replace: true });
    }
  };

  const clearRegionFilter = () => {
    navigate('/admin', { replace: true });
  };
  
  const handleResetFilters = () => {
    setDateRange(initialDateRange);
    setReportsSearch('');
    setNewMembersSearch('');
    setReportsPage(1);
    setNewMembersPage(1);
    navigate('/admin', { replace: true });
  };
  
    const handleQuickFilter = (period: 'week' | 'month' | 'quarter') => {
        const end = new Date();
        const start = new Date();
        if (period === 'week') {
            start.setDate(end.getDate() - 7);
        } else if (period === 'month') {
            start.setMonth(end.getMonth() - 1);
        } else if (period === 'quarter') {
            start.setMonth(end.getMonth() - 3);
        }
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        });
    };

    const handleFeatureTestimony = async (reportId: string) => {
        await api.setFeaturedTestimony(reportId);
        setFeaturedTestimonyId(reportId);
        showToast("Témoignage mis en avant sur la page d'accueil.", 'success');
    };

    const handleUnfeatureTestimony = async () => {
        await api.unfeatureTestimony();
        setFeaturedTestimonyId(null);
        showToast("Témoignage retiré de la page d'accueil.", 'info');
    };

  const isFilterActive = useMemo(() => {
    const isDateChanged = dateRange.start !== initialDateRange.start || dateRange.end !== initialDateRange.end;
    const isSearchActive = reportsSearch !== '' || newMembersSearch !== '';
    const isRegionFiltered = !!regionFilter;
    return isDateChanged || isSearchActive || isRegionFiltered;
  }, [dateRange, reportsSearch, newMembersSearch, regionFilter, initialDateRange]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- DERIVED DATA & FILTERS ---
  const reportsToAnalyze = useMemo(() => {
    return regionFilter ? reports.filter(r => r.region === regionFilter) : reports;
  }, [reports, regionFilter]);
  
  const stats = useMemo(() => {
    if (reportsToAnalyze.length === 0) return { totalReports: 0, avgAttendance: 0, totalMembers: 0, newMembers: 0, totalVisits: 0, totalPresentSum: 0 };
    
    const totalReports = reportsToAnalyze.length;
    const totalPresentSum = reportsToAnalyze.reduce((acc, r) => acc + r.totalPresent, 0);
    const avgAttendance = totalReports > 0 ? Math.round(totalPresentSum / totalReports) : 0;
    const newMembers = reportsToAnalyze.reduce((acc, r) => acc + r.invitedPeople.length, 0);
    const totalVisits = reportsToAnalyze.reduce((acc, r) => acc + r.visitsMade.length, 0);
    
    const latestReportsByCell = new Map<string, Report>();
    reportsToAnalyze.forEach(r => {
        const key = `${r.region}-${r.group}-${r.district}-${r.cellName}`;
        if (!latestReportsByCell.has(key) || new Date(r.cellDate) > new Date(latestReportsByCell.get(key)!.cellDate)) {
            latestReportsByCell.set(key, r);
        }
    });

    const totalMembers = Array.from(latestReportsByCell.values()).reduce((acc, r) => acc + r.registeredMen + r.registeredWomen + r.registeredChildren, 0);

    return { totalReports, avgAttendance, totalMembers, newMembers, totalVisits, totalPresentSum };
  }, [reportsToAnalyze]);

  const demographicsData = useMemo(() => {
    const latestReportsByCell = new Map<string, Report>();
    reportsToAnalyze.forEach(r => {
        const key = `${r.region}-${r.group}-${r.district}-${r.cellName}`;
         if (!latestReportsByCell.has(key) || new Date(r.cellDate) > new Date(latestReportsByCell.get(key)!.cellDate)) {
            latestReportsByCell.set(key, r);
        }
    });
    
    const totals = Array.from(latestReportsByCell.values()).reduce((acc, r) => {
        acc.men += r.registeredMen;
        acc.women += r.registeredWomen;
        acc.children += r.registeredChildren;
        return acc;
    }, { men: 0, women: 0, children: 0 });

    return [
        { name: 'Hommes', value: totals.men },
        { name: 'Femmes', value: totals.women },
        { name: 'Enfants', value: totals.children },
    ].filter(d => d.value > 0);
  }, [reportsToAnalyze]);
  
  const membersByRegionData = useMemo(() => {
    const latestReportsByCell = new Map<string, Report>();
    // Note: for this global view, we use all reports, not just filtered ones.
    reports.forEach(r => { 
        const key = `${r.region}-${r.group}-${r.district}-${r.cellName}`;
        if (!latestReportsByCell.has(key) || new Date(r.cellDate) > new Date(latestReportsByCell.get(key)!.cellDate)) {
            latestReportsByCell.set(key, r);
        }
    });

    const regionalData: { [region: string]: { men: number, women: number, children: number } } = {};

    Array.from(latestReportsByCell.values()).forEach(report => {
        if (!regionalData[report.region]) {
            regionalData[report.region] = { men: 0, women: 0, children: 0 };
        }
        regionalData[report.region].men += report.registeredMen;
        regionalData[report.region].women += report.registeredWomen;
        regionalData[report.region].children += report.registeredChildren;
    });

    return Object.entries(regionalData)
        .map(([region, data]) => ({
            region,
            ...data,
            total: data.men + data.women + data.children,
        }))
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total); 

  }, [reports]);

  const groupDataByWeek = (keyExtractor: (r: Report) => number) => {
    const sortedReports = [...reportsToAnalyze].sort((a,b) => new Date(a.cellDate).getTime() - new Date(b.cellDate).getTime());
    const grouped: { [weekStart: string]: { value: number; count: number } } = {};
    
    sortedReports.forEach(r => {
        const date = new Date(r.cellDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // get Monday
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const weekKey = monday.toISOString().split('T')[0];

        if (!grouped[weekKey]) {
            grouped[weekKey] = { value: 0, count: 0 };
        }
        grouped[weekKey].value += keyExtractor(r);
        grouped[weekKey].count += 1;
    });

    return Object.entries(grouped).map(([weekKey, values]) => {
        const weekDate = new Date(weekKey);
        return { 
            label: weekDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit'}), 
            ...values 
        };
    });
  };

  const attendanceOverTimeData = useMemo(() => {
    const data = groupDataByWeek(r => r.totalPresent);
    return data.map(d => ({ date: d.label, "Présence totale": d.value }));
  }, [reportsToAnalyze]);

  const visitsOverTimeData = useMemo(() => {
    const data = groupDataByWeek(r => r.visitsMade.length);
    return data.map(d => ({ date: d.label, "Visites effectuées": d.value }));
  }, [reportsToAnalyze]);
  
  const programParticipationData = useMemo(() => {
    const totals = reportsToAnalyze.reduce((acc, r) => {
        acc.bibleStudy += r.bibleStudy;
        acc.miracleHour += r.miracleHour;
        acc.sundayService += r.sundayServiceAttendance;
        return acc;
    }, { bibleStudy: 0, miracleHour: 0, sundayService: 0 });
    
    return [
        { name: 'Étude Biblique', Participation: totals.bibleStudy },
        { name: 'Heure de Miracle', Participation: totals.miracleHour },
        { name: 'Culte Dominical', Participation: totals.sundayService },
    ].filter(d => d.Participation > 0);
  }, [reportsToAnalyze]);

  const poignantTestimonies = useMemo(() => {
    return reportsToAnalyze
        .filter(r => r.poignantTestimony && r.poignantTestimony.trim() !== '')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reportsToAnalyze]);
  
  const paginatedReports = useMemo(() => {
    const filtered = reportsToAnalyze.filter(r => !reportsSearch || 
        r.leaderName.toLowerCase().includes(reportsSearch.toLowerCase()) || 
        r.cellName.toLowerCase().includes(reportsSearch.toLowerCase()) || 
        r.region.toLowerCase().includes(reportsSearch.toLowerCase()) ||
        r.group.toLowerCase().includes(reportsSearch.toLowerCase()) ||
        r.district.toLowerCase().includes(reportsSearch.toLowerCase())
    );
    return filtered.slice((reportsPage - 1) * ITEMS_PER_PAGE, reportsPage * ITEMS_PER_PAGE);
  }, [reportsToAnalyze, reportsSearch, reportsPage]);
  
  const totalFilteredReports = useMemo(() => {
     return reportsToAnalyze.filter(r => !reportsSearch || 
        r.leaderName.toLowerCase().includes(reportsSearch.toLowerCase()) || 
        r.cellName.toLowerCase().includes(reportsSearch.toLowerCase()) || 
        r.region.toLowerCase().includes(reportsSearch.toLowerCase()) ||
        r.group.toLowerCase().includes(reportsSearch.toLowerCase()) ||
        r.district.toLowerCase().includes(reportsSearch.toLowerCase())
    ).length;
  }, [reportsToAnalyze, reportsSearch]);

  const paginatedNewMembers = useMemo(() => {
    const allNewMembers = reportsToAnalyze.flatMap(report => 
      report.invitedPeople.map(person => ({ ...person, region: report.region, cellDate: report.cellDate, leaderName: report.leaderName }))
    ).sort((a, b) => new Date(b.cellDate).getTime() - new Date(a.cellDate).getTime());

    const filtered = allNewMembers.filter(p => !newMembersSearch || p.name.toLowerCase().includes(newMembersSearch.toLowerCase()) || p.leaderName.toLowerCase().includes(newMembersSearch.toLowerCase()) || p.region.toLowerCase().includes(newMembersSearch.toLowerCase()));
    return filtered.slice((newMembersPage - 1) * ITEMS_PER_PAGE, newMembersPage * ITEMS_PER_PAGE);
  }, [reportsToAnalyze, newMembersSearch, newMembersPage]);
  
  const totalFilteredNewMembers = useMemo(() => {
    const allNewMembers = reportsToAnalyze.flatMap(report => 
      report.invitedPeople.map(person => ({ ...person, region: report.region, cellDate: report.cellDate, leaderName: report.leaderName }))
    );
    return allNewMembers.filter(p => !newMembersSearch || p.name.toLowerCase().includes(newMembersSearch.toLowerCase()) || p.leaderName.toLowerCase().includes(newMembersSearch.toLowerCase()) || p.region.toLowerCase().includes(newMembersSearch.toLowerCase())).length;
  }, [reportsToAnalyze, newMembersSearch]);
  
  const allReportsForTrend = useMemo(() => getLocalStorageItem<Report[]>('reports', []), []);
  const allCells = useMemo(() => getLocalStorageItem<CellType[]>('cells', []), []);

  const regionalTrends = useMemo(() => {
    if (user.role !== UserRole.NATIONAL_COORDINATOR) return null;
    return calculateTrend(allReportsForTrend);
  }, [allReportsForTrend, user.role]);

    const cellStatusCounts = useMemo(() => {
        if (user.role !== UserRole.NATIONAL_COORDINATOR) return null;
        const counts: { [key in CellStatus]: number } = {
            'Active': 0,
            'En implantation': 0,
            'En multiplication': 0,
            'En pause': 0,
        };
        const cellsToCount = regionFilter ? allCells.filter(c => c.region === regionFilter) : allCells;
        cellsToCount.forEach(cell => {
            if (counts[cell.status] !== undefined) {
                counts[cell.status]++;
            }
        });
        return counts;
    }, [allCells, user.role, regionFilter]);

  const summaryDataByRegion = useMemo(() => {
    if (user.role !== UserRole.NATIONAL_COORDINATOR) return [];
    
    const dataMap: { [key: string]: { reportsCount: number; totalPresent: number; bibleStudy: number; miracleHour: number; sundayService: number; } } = {};
    REGIONS.forEach(region => {
        dataMap[region] = { reportsCount: 0, totalPresent: 0, bibleStudy: 0, miracleHour: 0, sundayService: 0 };
    });

    reports.forEach(report => {
        if (dataMap[report.region]) {
            dataMap[report.region].reportsCount += 1;
            dataMap[report.region].totalPresent += report.totalPresent;
            dataMap[report.region].bibleStudy += report.bibleStudy;
            dataMap[report.region].miracleHour += report.miracleHour;
            dataMap[report.region].sundayService += report.sundayServiceAttendance;
        }
    });

    return Object.entries(dataMap).map(([name, values]) => ({ 
        name, 
        ...values,
        trend: regionalTrends ? regionalTrends[name] : null
    }));
  }, [reports, user.role, regionalTrends]);

  const summaryDataByGroup = useMemo(() => {
    if (!regionFilter) return [];
    const dataMap: { [key: string]: { reportsCount: number; totalPresent: number; bibleStudy: number; miracleHour: number; sundayService: number; } } = {};
    
    reports.filter(r => r.region === regionFilter).forEach(report => {
        const groupName = report.group || 'N/A';
        if (!dataMap[groupName]) {
            dataMap[groupName] = { reportsCount: 0, totalPresent: 0, bibleStudy: 0, miracleHour: 0, sundayService: 0 };
        }
        dataMap[groupName].reportsCount += 1;
        dataMap[groupName].totalPresent += report.totalPresent;
        dataMap[groupName].bibleStudy += report.bibleStudy;
        dataMap[groupName].miracleHour += report.miracleHour;
        dataMap[groupName].sundayService += report.sundayServiceAttendance;
    });

    return Object.entries(dataMap).map(([name, values]) => ({ name, ...values }));
  }, [reports, regionFilter]);

  const handleExportXLSX = () => {
    if (reports.length === 0) return;
    const reportsSheetData = reportsToAnalyze.map(r => ({ 
        "Date de la cellule": new Date(r.cellDate).toLocaleDateString('fr-FR'), 
        "Région": r.region, 
        "Groupe": r.group,
        "District": r.district,
        "Nom Cellule": r.cellName,
        "Catégorie": r.cellCategory,
        "Responsable": r.leaderName, 
        "Contact Responsable": r.leaderContact, 
        "Inscrits Hommes": r.registeredMen,
        "Inscrits Femmes": r.registeredWomen,
        "Inscrits Enfants": r.registeredChildren,
        "Total Inscrits": r.registeredMen + r.registeredWomen + r.registeredChildren,
        "Présents": r.attendees, 
        "Absents": r.absentees, 
        "Total Présents Jour": r.totalPresent, 
        "Nouveaux Invités (nombre)": r.invitedPeople.length, 
        "Programme des visites": r.visitSchedule, 
        "Visites Effectuées (nombre)": r.visitsMade.length,
        "Part. Étude Biblique": r.bibleStudy, 
        "Part. Heure Miracle": r.miracleHour, 
        "Part. Culte Dominical": r.sundayServiceAttendance, 
        "Sortie d'évangélisation": r.evangelismOuting, 
        "Témoignage Poignant": r.poignantTestimony,
        "Message": r.message, 
        "Date de soumission": new Date(r.submittedAt).toLocaleString('fr-FR'), 
    }));
    const newMembersSheetData = paginatedNewMembers.map(p => ({ "Nom de l'invité": p.name, "Contact": p.contact, "Adresse": p.address, "Date de la rencontre": new Date(p.cellDate).toLocaleDateString('fr-FR'), "Responsable Cellule": p.leaderName, "Région": p.region, }));
    const visitsSheetData = reportsToAnalyze.flatMap(r => r.visitsMade.map(v => ({ "Personne visitée": v.name, "Sujet": v.subject, "Besoin exprimé": v.need, "Date de la cellule": new Date(r.cellDate).toLocaleDateString('fr-FR'), "Responsable Cellule": r.leaderName, "Région": r.region, })) );
    const wsReports = XLSX.utils.json_to_sheet(reportsSheetData);
    const wsNewMembers = XLSX.utils.json_to_sheet(newMembersSheetData);
    const wsVisits = XLSX.utils.json_to_sheet(visitsSheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsReports, "Rapports");
    if (newMembersSheetData.length > 0) XLSX.utils.book_append_sheet(wb, wsNewMembers, "Nouveaux Invités");
    if (visitsSheetData.length > 0) XLSX.utils.book_append_sheet(wb, wsVisits, "Visites Effectuées");
    const fileName = `Export_Rapports_MVCP_${dateRange.start}_au_${dateRange.end}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  
   const handleExportPDF = async () => {
    if (!pdfRef.current || reports.length === 0) {
        showToast("Aucune donnée à exporter en PDF.", "info");
        return;
    }
    setIsGeneratingPDF(true);
    try {
        const canvas = await html2canvas(pdfRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const pdfHeight = pdfWidth / ratio;
        
        let position = 0;
        let heightLeft = pdfHeight;
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
        }

        const fileName = `Rapport_MVCP_${dateRange.start}_au_${dateRange.end}.pdf`;
        pdf.save(fileName);
        showToast("Rapport PDF généré avec succès.", "success");
    } catch (error) {
        showToast("Erreur lors de la génération du PDF.", "error");
        console.error("PDF generation error:", error);
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const getDashboardTitle = () => {
    let title = "Tableau de bord";
    if (user.role === UserRole.REGIONAL_PASTOR) return `${title} - Région ${user.region}`;
    if (user.role === UserRole.GROUP_PASTOR) return `${title} - Groupe ${user.group} (Région ${user.region})`;
    if (user.role === UserRole.DISTRICT_PASTOR) return `${title} - District ${user.district}`;
    if (regionFilter) return `${title} - Région ${regionFilter}`;
    return title;
  };
  
  const isSingleDay = dateRange.start === dateRange.end;
  const attendanceTitle = isSingleDay ? "Présence Totale (jour)" : "Présence Moyenne";
  const attendanceValue = isSingleDay ? stats.totalPresentSum : stats.avgAttendance;

  const renderTrendAnalysisPanel = () => {
    if (!regionalTrends) return null;

    const redZones = Object.entries(regionalTrends).filter(([, data]) => data.status === 'decline');
    const orangeZones = Object.entries(regionalTrends).filter(([, data]) => data.status === 'stagnation');

    if (redZones.length === 0 && orangeZones.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800">Analyse de l'Évolution (8 dernières semaines)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {redZones.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <h4 className="font-semibold text-red-800">Zones Rouges (Décroissance)</h4>
                        <ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
                            {redZones.map(([region, data]) => (
                                <li key={region}>
                                    <button onClick={() => setDrillDownData({ region })} className="text-left hover:underline">
                                        {region} <span className="font-bold">({data.change?.toFixed(0)}%)</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {orangeZones.length > 0 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                        <h4 className="font-semibold text-orange-800">Zones Oranges (Stagnation)</h4>
                        <ul className="list-disc list-inside mt-2 text-sm text-orange-700 space-y-1">
                            {orangeZones.map(([region, data]) => (
                                <li key={region}>
                                    <button onClick={() => setDrillDownData({ region })} className="text-left hover:underline">
                                        {region} <span className="font-bold">({data.change?.toFixed(0)}%)</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
             <p className="text-xs text-gray-500 text-center mt-2">Cliquez sur une région pour voir les détails.</p>
        </div>
    );
  };

  const renderDashboardContent = () => {
    if (!loading && reports.length === 0 && !error) {
        return <EmptyState onReset={handleResetFilters} />;
    }

    return (
        <div className="space-y-8">
            {user.role === UserRole.NATIONAL_COORDINATOR && renderTrendAnalysisPanel()}
            
             {regionFilter && user.role === UserRole.NATIONAL_COORDINATOR && (
                <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-blue-800 animate-fade-in">
                    <span>Filtre activé pour la région : <strong className="font-semibold">{regionFilter}</strong></span>
                    <button onClick={clearRegionFilter} className="text-sm font-semibold hover:underline">Effacer le filtre</button>
                </div>
            )}
            
            <div className={`grid grid-cols-1 md:grid-cols-2 ${user.role === UserRole.NATIONAL_COORDINATOR ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
                <StatCard title="Rapports Soumis" value={stats.totalReports} icon={<ChartBarIcon className="h-8 w-8 text-blue-600"/>} onClick={() => scrollTo('reports-list')} />
                <StatCard title="Membres Inscrits" value={stats.totalMembers} icon={<UsersIcon className="h-8 w-8 text-blue-600"/>} onClick={() => setIsMembersModalOpen(true)} />
                <StatCard title={attendanceTitle} value={attendanceValue} icon={<CheckCircleIcon className="h-8 w-8 text-blue-600"/>} />
                <StatCard title="Nouveaux Invités" value={stats.newMembers} icon={<UsersIcon className="h-8 w-8 text-blue-600"/>} onClick={() => scrollTo('new-members-list')} />
                 {user.role === UserRole.NATIONAL_COORDINATOR && cellStatusCounts && (
                    <div className="bg-white p-4 rounded-xl shadow-md flex flex-col justify-center space-y-2">
                        <p className="text-sm text-center font-semibold text-gray-600">Statut des Cellules</p>
                        <div className="flex justify-around text-xs text-center">
                            <div><p className="font-bold text-lg text-green-600">{cellStatusCounts['Active']}</p><p>Actives</p></div>
                            <div><p className="font-bold text-lg text-blue-600">{cellStatusCounts['En multiplication']}</p><p>En Mult.</p></div>
                            <div><p className="font-bold text-lg text-yellow-600">{cellStatusCounts['En implantation']}</p><p>Implant.</p></div>
                            <div><p className="font-bold text-lg text-gray-500">{cellStatusCounts['En pause']}</p><p>En Pause</p></div>
                        </div>
                    </div>
                )}
            </div>
            
             {user.role === UserRole.NATIONAL_COORDINATOR && (
                <SummaryTable
                    title="Synthèse par Région"
                    data={summaryDataByRegion.map(d => ({
                        name: d.name,
                        reportsCount: d.reportsCount,
                        totalPresent: d.totalPresent,
                        trend: <TrendBadge trend={d.trend} />,
                        bibleStudy: d.bibleStudy,
                        miracleHour: d.miracleHour,
                        sundayService: d.sundayService
                    }))}
                    headers={['Région', 'Rapports', 'Présence Totale', 'Tendance', 'Étude Biblique', 'Heure Miracle', 'Culte Dominical']}
                />
            )}

            {user.role === UserRole.NATIONAL_COORDINATOR && regionFilter && (
                <SummaryTable
                    title={`Synthèse de la Participation par Groupe (${regionFilter})`}
                    data={summaryDataByGroup.map(d => ({
                        name: d.name,
                        reportsCount: d.reportsCount,
                        totalPresent: d.totalPresent,
                        bibleStudy: d.bibleStudy,
                        miracleHour: d.miracleHour,
                        sundayService: d.sundayService
                    }))}
                    headers={['Groupe', 'Rapports', 'Présence Totale', 'Étude Biblique', 'Heure Miracle', 'Culte Dominical']}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-4">Évolution hebdomadaire de la participation</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="Présence totale" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-4">Répartition des membres</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={demographicsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label>
                                {demographicsData.map((entry, index) => <Cell key={`cell-${index}`} fill={DEMOGRAPHICS_COLORS[index % DEMOGRAPHICS_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-4">Participation aux Programmes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={programParticipationData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Participation" fill="#3B82F6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-4">Évolution hebdomadaire des visites</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={visitsOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="Visites effectuées" stroke="#10B981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {poignantTestimonies.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-md" id="testimonies-list">
                    <h3 className="font-semibold text-gray-700 mb-4">Témoignages Poignants</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                        {poignantTestimonies.map(r => {
                            const isFeatured = r.id === featuredTestimonyId;
                            return (
                                <div key={r.id} className={`p-4 rounded-r-lg transition-all duration-300 ${isFeatured ? 'bg-yellow-100 border-l-4 border-yellow-500 shadow-md' : 'bg-yellow-50 border-l-4 border-yellow-400'}`}>
                                    <p className="text-sm text-gray-800 italic">"{r.poignantTestimony}"</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-right text-xs font-semibold text-gray-600">- {r.leaderName}, {r.cellName} ({r.region})</p>
                                        {user.role === UserRole.NATIONAL_COORDINATOR && (
                                            <div className="flex items-center space-x-2">
                                                {isFeatured ? (
                                                    <button onClick={handleUnfeatureTestimony} className="flex items-center space-x-1 text-xs text-yellow-700 font-semibold hover:underline" title="Retirer de la page d'accueil">
                                                        <StarIcon solid className="h-4 w-4 text-yellow-600"/>
                                                        <span>En avant</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleFeatureTestimony(r.id)} className="flex items-center space-x-1 text-xs text-gray-500 font-semibold hover:text-blue-600" title="Mettre en avant sur la page d'accueil">
                                                        <StarIcon className="h-4 w-4"/>
                                                        <span>Mettre en avant</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-md" id="reports-list">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Rapports Récents</h3>
                    <input type="text" placeholder="Rechercher..." value={reportsSearch} onChange={e => setReportsSearch(e.target.value)} className="p-2 border rounded-md w-64"/>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Cellule</th>
                                {user.role === UserRole.NATIONAL_COORDINATOR && !regionFilter && <th className="px-4 py-3">Région</th>}
                                <th className="px-4 py-3">Présents</th>
                                <th className="px-4 py-3 text-center">Nouveaux</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedReports.map(r => (
                                <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{new Date(r.cellDate).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{r.cellName} <span className="text-gray-500">({r.leaderName})</span></td>
                                    {user.role === UserRole.NATIONAL_COORDINATOR && !regionFilter && <td className="px-4 py-3">{r.region}</td>}
                                    <td className="px-4 py-3">{r.attendees} / {r.registeredMen + r.registeredWomen + r.registeredChildren}</td>
                                    <td className="px-4 py-3 text-center">{r.invitedPeople.length}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => setSelectedReport(r)} className="text-blue-600 hover:underline text-xs font-medium">Détails</button>
                                            <button onClick={() => handleDeleteRequest(r)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" aria-label="Supprimer le rapport">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={reportsPage} totalItems={totalFilteredReports} onPageChange={setReportsPage} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md" id="new-members-list">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Nouveaux Invités</h3>
                    <input type="text" placeholder="Rechercher..." value={newMembersSearch} onChange={e => setNewMembersSearch(e.target.value)} className="p-2 border rounded-md w-64"/>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3">Nom</th>
                                <th className="px-4 py-3">Contact</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Cellule d'accueil</th>
                            </tr>
                        </thead>
                        <tbody>
                             {paginatedNewMembers.map(p => (
                                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                    <td className="px-4 py-3">{p.contact} <span className="text-gray-500">({p.address})</span></td>
                                    <td className="px-4 py-3">{new Date(p.cellDate).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-4 py-3">{p.leaderName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <Pagination currentPage={newMembersPage} totalItems={totalFilteredNewMembers} onPageChange={setNewMembersPage} />
            </div>

        </div>
    );
  };
  
  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{getDashboardTitle()}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                 <div>
                    <label htmlFor="start" className="block text-sm font-medium text-gray-700">Date de début</label>
                    <input type="date" name="start" id="start" value={dateRange.start} onChange={handleDateChange} className="mt-1 w-full p-2 border rounded-md"/>
                </div>
                <div>
                    <label htmlFor="end" className="block text-sm font-medium text-gray-700">Date de fin</label>
                    <input type="date" name="end" id="end" value={dateRange.end} onChange={handleDateChange} className="mt-1 w-full p-2 border rounded-md"/>
                </div>
                 {user.role === UserRole.NATIONAL_COORDINATOR && (
                    <div>
                        <label htmlFor="region" className="block text-sm font-medium text-gray-700">Filtrer par Région</label>
                        <select id="region" name="region" value={regionFilter || 'all'} onChange={handleRegionFilterChange} className="mt-1 w-full p-2 border rounded-md">
                            <option value="all">Toutes les régions</option>
                            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                )}
                 <div className="flex space-x-2">
                     <button onClick={handleExportXLSX} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg flex-1 flex items-center justify-center space-x-2" title="Exporter en Excel">
                        <FileDownloadIcon className="h-5 w-5"/> <span>XLSX</span>
                     </button>
                      <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex-1 flex items-center justify-center space-x-2 disabled:bg-red-400" title="Exporter en PDF">
                         {isGeneratingPDF ? <SpinnerIcon className="h-5 w-5"/> : <DocumentTextIcon className="h-5 w-5"/>}
                         <span>PDF</span>
                     </button>
                     {isFilterActive && <button onClick={handleResetFilters} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg flex-1 flex items-center justify-center" title="Réinitialiser les filtres"><RefreshIcon className="h-5 w-5"/></button>}
                </div>
            </div>
             {user.role === UserRole.NATIONAL_COORDINATOR && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-gray-700 self-center">Filtres rapides:</span>
                    <button onClick={() => handleQuickFilter('week')} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-full">Cette semaine</button>
                    <button onClick={() => handleQuickFilter('month')} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-full">Ce mois-ci</button>
                    <button onClick={() => handleQuickFilter('quarter')} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-full">Ce trimestre</button>
                </div>
            )}
        </div>
        
        {loading && <div className="flex justify-center items-center p-20"><SpinnerIcon className="h-16 w-16 text-blue-700"/></div>}

        {error && 
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow">
                <div className="flex items-center">
                    <AlertTriangleIcon className="h-6 w-6 mr-3" />
                    <div>
                       <h3 className="font-bold">Une erreur est survenue</h3>
                       <p>{error}</p>
                    </div>
                </div>
            </div>
        }
        
        {!loading && !error && renderDashboardContent()}
        
        <ReportDetailModal 
            report={selectedReport} 
            onClose={() => setSelectedReport(null)}
            onDeleteRequest={handleDeleteRequest}
        />
        
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={confirmDeleteReport}
            title="Supprimer le Rapport"
            message={`Êtes-vous sûr de vouloir supprimer le rapport de "${reportToDelete?.cellName}" du ${reportToDelete ? new Date(reportToDelete.cellDate).toLocaleDateString('fr-FR') : ''} ? Cette action est irréversible.`}
            confirmText="Supprimer"
            isConfirming={isDeleting}
        />

        <MembersByRegionModal 
            isOpen={isMembersModalOpen}
            onClose={() => setIsMembersModalOpen(false)}
            data={membersByRegionData}
        />

        <DrillDownModal 
            isOpen={!!drillDownData}
            onClose={() => setDrillDownData(null)}
            region={drillDownData?.region || ''}
            allReports={allReportsForTrend}
        />

        {/* Hidden component for PDF generation */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
             {reports.length > 0 && <ReportPDF 
                ref={pdfRef}
                user={user}
                stats={stats}
                dateRange={dateRange}
                regionFilter={regionFilter}
                summaryData={summaryDataByRegion}
                demographicsData={demographicsData}
                title={getDashboardTitle()}
             />}
        </div>
    </div>
  );
};

export default Dashboard;