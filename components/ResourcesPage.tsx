import React, { useState, useEffect, useCallback } from 'react';
import { api, getLocalStorageItem } from '../services/api.ts';
import { Resource, UserRole, Report } from '../types.ts';
import { SpinnerIcon, AlertTriangleIcon, CloudUploadIcon, DocumentTextIcon, FileDownloadIcon, TrashIcon, BookOpenIcon } from './icons.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';


// Helper to format file size
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const UploadSection: React.FC<{ onUpload: () => void }> = ({ onUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showToast("Veuillez sélectionner un fichier.", 'info');
            return;
        }
        setIsUploading(true);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (event) => {
                if (!event.target?.result) {
                    throw new Error("La lecture du fichier a échoué.");
                }
                const resource: Omit<Resource, 'id' | 'uploadedAt'> = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: event.target.result as string,
                };
                await api.addResource(resource);
                showToast("Fichier téléversé avec succès.", 'success');
                setFile(null); // Reset file input
                onUpload(); // Trigger refresh in parent
            };
            reader.onerror = () => {
                throw new Error("Erreur de lecture du fichier.");
            };
        } catch (error: any) {
            showToast(error.message || "Erreur lors du téléversement.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-blue-50 border-2 border-dashed border-blue-300 p-6 rounded-xl text-center h-full flex flex-col justify-center">
            <CloudUploadIcon className="mx-auto h-12 w-12 text-blue-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Partager des documents</h3>
            <p className="mt-1 text-sm text-gray-600">Téléversez des guides, formations ou communications.</p>
            <div className="mt-4">
                <input type="file" id="file-upload" className="sr-only" onChange={handleFileChange} />
                <label htmlFor="file-upload" className="cursor-pointer bg-white text-blue-700 font-semibold py-2 px-4 border border-blue-300 rounded-md hover:bg-blue-100">
                    Choisir un fichier
                </label>
                {file && <p className="mt-2 text-sm text-gray-700">Sélectionné: <strong>{file.name}</strong></p>}
            </div>
            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center space-x-2"
            >
                {isUploading ? <SpinnerIcon /> : <CloudUploadIcon className="h-5 w-5" />}
                <span>{isUploading ? 'Téléversement...' : 'Téléverser'}</span>
            </button>
        </div>
    );
};

const KEY_VERSES = [
    { verse: "Jean 3:16", text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle." },
    { verse: "Romains 10:9", text: "Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton cœur que Dieu l'a ressuscité des morts, tu seras sauvé." },
    { verse: "Matthieu 28:19-20", text: "Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit, et enseignez-leur à observer tout ce que je vous ai prescrit." },
    { verse: "Actes 1:8", text: "Mais vous recevrez une puissance, le Saint-Esprit survenant sur vous, et vous serez mes témoins à Jérusalem, dans toute la Judée, dans la Samarie, et jusqu'aux extrémités de la terre." }
];


const ResourcesPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [resources, setResources] = useState<Resource[]>([]);
    const [testimonies, setTestimonies] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const resourcesData = await api.getResources();
            setResources(resourcesData);
            
            const allReportsData = getLocalStorageItem<Report[]>('reports', []);
            
            const recentTestimonies = allReportsData
                .filter(r => r.poignantTestimony && r.poignantTestimony.trim() !== '')
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                .slice(0, 10);
            
            setTestimonies(recentTestimonies);

        } catch (err: any) {
            setError("Erreur lors du chargement des ressources.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteRequest = (id: string, name: string) => {
        setItemToDelete({ id, name });
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteResource(itemToDelete.id);
            showToast("Ressource supprimée avec succès.", 'success');
            fetchData(); // Refresh list
        } catch (error: any) {
            showToast("Erreur lors de la suppression.", 'error');
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
            setItemToDelete(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center p-20"><SpinnerIcon className="h-16 w-16 text-blue-700"/></div>;
    }

    if (error) {
        return (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow max-w-4xl mx-auto">
                <div className="flex items-center">
                    <AlertTriangleIcon className="h-6 w-6 mr-3" />
                    <div><h3 className="font-bold">Une erreur est survenue</h3><p>{error}</p></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
            <header className="text-center">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Centre de Ressources</h1>
                <p className="text-lg text-gray-600">Documents, guides, inspiration et supports pour le ministère.</p>
            </header>

            {/* Section 1: Documents */}
            <section>
                 <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">Partage de Documents</h2>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md space-y-4">
                        {resources.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {resources.map(res => (
                                    <li key={res.id} className="py-4 flex items-center justify-between space-x-3">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <DocumentTextIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{res.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(res.uploadedAt).toLocaleDateString('fr-FR')} - {formatBytes(res.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center space-x-2">
                                            <a href={res.dataUrl} download={res.name} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Télécharger">
                                                <FileDownloadIcon className="h-5 w-5" />
                                            </a>
                                            {user?.role === UserRole.NATIONAL_COORDINATOR && (
                                                 <button onClick={() => handleDeleteRequest(res.id, res.name)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Supprimer">
                                                    <TrashIcon className="h-5 w-5" />
                                                 </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-10">Aucun document n'a encore été partagé.</p>
                        )}
                    </div>
                    {user?.role === UserRole.NATIONAL_COORDINATOR && (
                        <div className="lg:col-span-1">
                            <UploadSection onUpload={fetchData} />
                        </div>
                    )}
                </div>
            </section>
            
            {/* Section 2: Inspiration */}
            <section className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">Inspiration et Croissance</h2>
                <div className="max-w-3xl mx-auto">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">✝️ Mur des Témoignages Poignants</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 rounded-lg bg-gray-50 p-4 border">
                        {testimonies.length > 0 ? testimonies.map(r => (
                            <div key={r.id} className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
                                <p className="text-sm text-gray-800 italic">"{r.poignantTestimony}"</p>
                                <p className="text-right text-xs font-semibold text-gray-600 mt-2">- Cellule {r.cellName} ({r.region})</p>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-8">Aucun témoignage poignant soumis récemment.</p>
                        )}
                    </div>
                </div>
            </section>
            
             {/* Section 3: Outils */}
            <section className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">Outils pour le Ministère</h2>
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

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Supprimer la ressource"
                message={`Êtes-vous sûr de vouloir supprimer le fichier "${itemToDelete?.name}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                isConfirming={isDeleting}
            />
        </div>
    );
};

export default ResourcesPage;