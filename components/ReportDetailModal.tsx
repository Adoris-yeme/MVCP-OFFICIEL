import React from 'react';
import { Report } from '../types.ts';
import { TrashIcon } from './icons.tsx';

interface ReportDetailModalProps {
    report: Report | null;
    onClose: () => void;
    onDeleteRequest: (report: Report) => void;
}

const DetailRow: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
            {children || value}
        </dd>
    </div>
);

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose, onDeleteRequest }) => {
    if (!report) return null;
    
    const registeredTotal = report.registeredMen + report.registeredWomen + report.registeredChildren;

    const handleDeleteClick = () => {
        if (report) {
            onDeleteRequest(report);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Détails du Rapport</h3>
                        <p className="text-sm text-gray-500">
                            {report.cellName} ({new Date(report.cellDate).toLocaleDateString('fr-FR')})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* General Info */}
                    <div className="border-t border-gray-200">
                        <dl className="divide-y divide-gray-200">
                           <DetailRow label="Hiérarchie" value={`${report.region} > ${report.group} > ${report.district}`} />
                           <DetailRow label="Catégorie" value={report.cellCategory} />
                           <DetailRow label="Responsable" value={report.leaderName} />
                           <DetailRow label="Contact" value={report.leaderContact} />
                        </dl>
                    </div>

                    {/* Stats */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Statistiques</h4>
                        <div className="border-t border-gray-200">
                            <dl className="divide-y divide-gray-200">
                                <DetailRow label="Membres inscrits" value={`${registeredTotal} (H: ${report.registeredMen}, F: ${report.registeredWomen}, E: ${report.registeredChildren})`} />
                                <DetailRow label="Présents (inscrits)" value={report.attendees} />
                                <DetailRow label="Absents (inscrits)" value={report.absentees} />
                                <DetailRow label="Total présents ce jour" value={report.totalPresent} />
                            </dl>
                        </div>
                    </div>
                    
                    {/* Invited People */}
                    {report.invitedPeople.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Personnes Invitées ({report.invitedPeople.length})</h4>
                             <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                                {report.invitedPeople.map((p, i) => (
                                    <li key={i} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                        <div className="w-0 flex-1 flex items-center">
                                            <span className="ml-2 flex-1 w-0 truncate">
                                                <strong>{p.name}</strong> - {p.contact} - {p.address}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                     {/* Visits */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Visites</h4>
                        <div className="border-t border-gray-200">
                            <dl className="divide-y divide-gray-200">
                                <DetailRow label="Programme des visites" value={report.visitSchedule || "Non spécifié"} />
                                <DetailRow label="Visites effectuées">
                                    {report.visitsMade.length > 0 ? (
                                        <ul className="list-disc list-inside">
                                            {report.visitsMade.map((v, i) => (
                                                <li key={i}><strong>{v.name}:</strong> Sujet: {v.subject}, Besoin: {v.need}</li>
                                            ))}
                                        </ul>
                                    ) : "Aucune visite effectuée"}
                                </DetailRow>
                            </dl>
                        </div>
                    </div>

                    {/* Participation */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Participation</h4>
                        <div className="border-t border-gray-200">
                            <dl className="divide-y divide-gray-200">
                                <DetailRow label="Étude biblique" value={report.bibleStudy || "0"} />
                                <DetailRow label="Heure de réveil & miracle" value={report.miracleHour || "0"} />
                                <DetailRow label="Présence au culte dominical" value={report.sundayServiceAttendance || "0"} />
                                <DetailRow label="Sortie d'évangélisation" value={report.evangelismOuting || "Non spécifié"} />
                            </dl>
                        </div>
                    </div>

                    {/* Testimony */}
                    {report.poignantTestimony && (
                         <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Témoignage Poignant</h4>
                            <div className="border-t border-gray-200 pt-2">
                                <p className="text-sm text-gray-800 bg-yellow-50 p-3 rounded-md">{report.poignantTestimony}</p>
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {report.message && (
                         <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Message au Coordinateur</h4>
                            <div className="border-t border-gray-200 pt-2">
                                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-md">{report.message}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end mt-auto">
                    <button 
                        onClick={handleDeleteClick}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        <TrashIcon className="h-5 w-5"/>
                        <span>Supprimer ce rapport</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportDetailModal;