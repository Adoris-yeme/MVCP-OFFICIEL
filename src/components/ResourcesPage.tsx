import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Report } from '../types.ts';
import { SpinnerIcon, BookOpenIcon, AlertTriangleIcon } from './icons.tsx';
import BeninMap from './BeninMap.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

const KEY_VERSES = [
    { verse: "Jean 3:16", text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle." },
    { verse: "Romains 10:9", text: "Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton cœur que Dieu l'a ressuscité des morts, tu seras sauvé." },
    { verse: "Matthieu 28:19-20", text: "Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit, et enseignez-leur à observer tout ce que je vous ai prescrit." },
    { verse: "Actes 1:8", text: "Mais vous recevrez une puissance, le Saint-Esprit survenant sur vous, et vous serez mes témoins à Jérusalem, dans toute la Judée, dans la Samarie, et jusqu'aux extrémités de la terre." }
];

const ResourcesPage: React.FC = () => {
    const { user } = useAuth();
    const [testimonies, setTestimonies] = useState<Report[]>([]);
    const [allReports, setAllReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        };

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Define a wide date range to fetch all accessible reports for the map/testimonies
                const endDate = new Date();
                const startDate = new Date();
                startDate.setFullYear(endDate.getFullYear() - 5); // 5 years of data
                const dateRange = {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0],
                };
                
                const reportsData = await api.getReports(user, dateRange);

                const testimoniesData = reportsData.filter(r => r.poignantTestimony && r.poignantTestimony.trim() !== '');

                setTestimonies(testimoniesData);
                setAllReports(reportsData);
            } catch (err: any) {
                setError("Erreur lors du chargement des ressources. Veuillez réessayer plus tard.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const cellCountByRegion = useMemo(() => {
        const counts: { [key: string]: number } = {};
        const uniqueCells = new Set<string>();

        // We iterate through all reports to find unique cells.
        // A cell is considered unique based on its full hierarchy path.
        allReports.forEach(report => {
            const cellIdentifier = `${report.region}|${report.group}|${report.district}|${report.cellName}`;
            if (!uniqueCells.has(cellIdentifier)) {
                uniqueCells.add(cellIdentifier);
                counts[report.region] = (counts[report.region] || 0) + 1;
            }
        });
        return counts;
    }, [allReports]);

    if (loading) {
        return <div className="flex justify-center items-center p-20"><SpinnerIcon className="h-16 w-16 text-blue-700"/></div>;
    }

    if (error) {
        return (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow max-w-4xl mx-auto">
                <div className="flex items-center">
                    <AlertTriangleIcon className="h-6 w-6 mr-3" />
                    <div>
                        <h3 className="font-bold">Une erreur est survenue</h3>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
            <header className="text-center">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Pôle d'Évangélisation</h1>
                <p className="text-lg text-gray-600">Équiper, Inspirer et Mobiliser pour la Grande Commission.</p>
            </header>

            {/* --- Phase 1: Resources --- */}
            <section className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">Centre de Ressources</h2>
                
                <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-4">
                    <BookOpenIcon className="h-6 w-6 mr-3 text-blue-600"/>
                    Versets Clés pour l'Évangélisation
                </h3>
                <ul className="space-y-4">
                    {KEY_VERSES.map(v => (
                        <li key={v.verse} className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                            <p className="font-semibold text-gray-700">{v.verse}</p>
                            <p className="text-sm text-gray-600 italic mt-1">"{v.text}"</p>
                        </li>
                    ))}
                </ul>
            </section>
            
            {/* --- Phase 2: Inspiration & Motivation --- */}
            <section className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">Inspiration et Croissance</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Conversion Testimonies */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">✝️ Mur des Témoignages Poignants</h3>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 rounded-lg bg-gray-50 p-4 border">
                            {testimonies.length > 0 ? testimonies.map(r => (
                                <div key={r.id} className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
                                    <p className="text-sm text-gray-800 italic">"{r.poignantTestimony}"</p>
                                    <p className="text-right text-xs font-semibold text-gray-600 mt-2">- Cellule {r.cellName} ({r.region})</p>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-center py-8">Aucun témoignage poignant soumis dans votre zone de service.</p>
                            )}
                        </div>
                    </div>

                    {/* Interactive Map */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">🗺️ Carte Interactive de vos Cellules</h3>
                        <div className="p-4 border rounded-lg shadow-inner bg-gray-100">
                           <BeninMap cellData={cellCountByRegion} />
                           <p className="text-xs text-center text-gray-500 mt-2">La carte affiche les cellules dans votre zone de service.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ResourcesPage;