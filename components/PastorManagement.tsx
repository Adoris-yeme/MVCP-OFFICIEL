import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { User, PastorData, UserRole } from '../types.ts';
import { api } from '../services/api.ts';
import { REGIONS } from '../constants.ts';
import { SpinnerIcon, PencilIcon, TrashIcon, PlusCircleIcon, ChartBarIcon, FileDownloadIcon, CheckCircleIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';

// Modal Component
const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const getRoleLabel = (role: UserRole) => {
    switch(role) {
        case UserRole.REGIONAL_PASTOR: return "Pasteur Régional";
        case UserRole.GROUP_PASTOR: return "Pasteur de Groupe";
        case UserRole.DISTRICT_PASTOR: return "Pasteur de District";
        default: return "N/A";
    }
}

type PastorTab = 'all' | UserRole.REGIONAL_PASTOR | UserRole.GROUP_PASTOR | UserRole.DISTRICT_PASTOR;

// Main Component
const PastorManagement: React.FC = () => {
    const [pastors, setPastors] = useState<User[]>([]);
    const [pendingPastors, setPendingPastors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPastor, setEditingPastor] = useState<PastorData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<PastorTab>('all');
    const { showToast } = useToast();
    const navigate = useNavigate();
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemToDeleteName, setItemToDeleteName] = useState('');


    const fetchAllPastors = async () => {
        try {
            setLoading(true);
            const approved = await api.getPastors();
            const pending = await api.getPendingPastors();
            setPastors(approved.sort((a, b) => (a.region || '').localeCompare(b.region || '')));
            setPendingPastors(pending);
        } catch (err: any) {
            showToast('Erreur lors du chargement des pasteurs.', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPastors();
    }, []);

    const filteredPastors = useMemo(() => {
        const roleFiltered = activeTab === 'all' ? pastors : pastors.filter(p => p.role === activeTab);
        
        if (!searchTerm) return roleFiltered;

        const lowercasedFilter = searchTerm.toLowerCase();
        return roleFiltered.filter(p =>
            p.name.toLowerCase().includes(lowercasedFilter) ||
            p.email.toLowerCase().includes(lowercasedFilter) ||
            p.contact?.includes(lowercasedFilter) ||
            p.region?.toLowerCase().includes(lowercasedFilter) ||
            p.group?.toLowerCase().includes(lowercasedFilter) ||
            p.district?.toLowerCase().includes(lowercasedFilter)
        );
    }, [pastors, searchTerm, activeTab]);

    const handleAdd = () => {
        setEditingPastor({ name: '', email: '', role: UserRole.REGIONAL_PASTOR, region: REGIONS[0], password: '', contact: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (pastor: User) => {
        setEditingPastor({ uid: pastor.uid, name: pastor.name, email: pastor.email, role: pastor.role, region: pastor.region, group: pastor.group, district: pastor.district, contact: pastor.contact });
        setIsModalOpen(true);
    };

    const handleApprove = async (uid: string) => {
        try {
            await api.approvePastor(uid);
            showToast('Pasteur approuvé avec succès.', 'success');
            await fetchAllPastors();
        } catch (err: any) {
            showToast(`Erreur lors de l'approbation : ${err.message}`, 'error');
        }
    };

    const handleDeleteRequest = (uid: string, name: string) => {
        setItemToDelete(uid);
        setItemToDeleteName(name);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await api.deletePastor(itemToDelete);
            showToast('Suppression réussie.', 'success');
            await fetchAllPastors();
        } catch (err: any) {
            showToast(`Erreur lors de la suppression : ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    
    const handleSave = async (pastorData: PastorData) => {
        try {
            if (pastorData.uid) { // Editing
                const { uid, ...dataToUpdate } = pastorData;
                await api.updatePastor(uid, dataToUpdate);
                showToast('Pasteur mis à jour avec succès.', 'success');
            } else { // Adding
                await api.addPastor(pastorData);
                showToast('Pasteur ajouté avec succès.', 'success');
            }
            setIsModalOpen(false);
            await fetchAllPastors();
        } catch (err: any) {
            showToast(`Erreur lors de l'enregistrement : ${err.message}`, 'error');
        }
    };

    const handleViewActivity = (region: string) => {
        navigate(`/admin?region=${encodeURIComponent(region)}`);
        window.scrollTo(0, 0);
    };

    const handleExport = () => {
        if (filteredPastors.length === 0) {
            showToast("Aucune donnée à exporter.", "info");
            return;
        }
        const dataToExport = filteredPastors.map(p => ({
            Nom: p.name, Email: p.email, "Téléphone": p.contact || '', Rôle: getRoleLabel(p.role), Région: p.region || '', Groupe: p.group || '', District: p.district || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pasteurs");
        XLSX.writeFile(workbook, "Liste_Pasteurs.xlsx");
        showToast('Liste des pasteurs exportée.', 'success');
    };

    const TabButton: React.FC<{ tabId: PastorTab, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tabId
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );

    if (loading) return <div className="flex justify-center items-center p-10"><SpinnerIcon className="h-12 w-12 text-blue-700" /></div>;
    
    return (
        <div className="space-y-8">

            {pendingPastors.length > 0 && (
                <div className="bg-yellow-50 p-6 rounded-xl shadow-md space-y-4 border-l-4 border-yellow-400">
                    <h3 className="text-xl font-bold text-yellow-800">Demandes d'inscription en attente ({pendingPastors.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <tbody>
                                {pendingPastors.map(pastor => (
                                    <tr key={pastor.uid} className="border-b border-yellow-200">
                                        <td className="px-4 py-3 font-medium text-gray-900">{pastor.name}<br/><span className="text-xs text-gray-500">{pastor.email}</span></td>
                                        <td className="px-4 py-3 text-xs">{getRoleLabel(pastor.role)}<br/><span>{[pastor.region, pastor.group, pastor.district].filter(Boolean).join(' > ')}</span></td>
                                        <td className="px-4 py-3 flex justify-end items-center space-x-2">
                                            <button onClick={() => handleApprove(pastor.uid)} className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full" title="Approuver"><CheckCircleIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDeleteRequest(pastor.uid, pastor.name)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" title="Rejeter"><TrashIcon className="h-5 w-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <input
                        type="text"
                        placeholder="Rechercher un pasteur..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 border rounded-md w-full md:w-auto flex-grow"
                    />
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <button onClick={handleExport} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg w-full md:w-auto">
                            <FileDownloadIcon className="h-5 w-5"/>
                            <span>Exporter (XLSX)</span>
                        </button>
                        <button onClick={handleAdd} className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg w-full md:w-auto">
                            <PlusCircleIcon className="h-5 w-5"/>
                            <span>Ajouter</span>
                        </button>
                    </div>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="flex space-x-2" aria-label="Tabs">
                        <TabButton tabId="all" label="Tous" />
                        <TabButton tabId={UserRole.REGIONAL_PASTOR} label="Régionaux" />
                        <TabButton tabId={UserRole.GROUP_PASTOR} label="De Groupe" />
                        <TabButton tabId={UserRole.DISTRICT_PASTOR} label="De District" />
                    </nav>
                </div>
            
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Nom & Contact</th>
                                <th className="px-6 py-3">Rôle</th>
                                <th className="px-6 py-3">Zone de service</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPastors.map(pastor => (
                                <tr key={pastor.uid} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {pastor.name}
                                        <br/><span className="text-xs text-gray-500">{pastor.email}</span>
                                        <br/><span className="text-xs font-semibold text-blue-600">{pastor.contact}</span>
                                    </td>
                                    <td className="px-6 py-4">{getRoleLabel(pastor.role)}</td>
                                    <td className="px-6 py-4">{[pastor.region, pastor.group, pastor.district].filter(Boolean).join(' > ')}</td>
                                    <td className="px-6 py-4 flex justify-end items-center space-x-3">
                                        {pastor.role === UserRole.REGIONAL_PASTOR && pastor.region && (
                                        <button onClick={() => handleViewActivity(pastor.region!)} className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full" title="Voir l'activité de la région">
                                            <ChartBarIcon className="h-5 w-5"/>
                                        </button>
                                        )}
                                        <button onClick={() => handleEdit(pastor)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full" title="Modifier"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDeleteRequest(pastor.uid, pastor.name)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" title="Supprimer"><TrashIcon className="h-5 w-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPastors.length === 0 && (
                        <p className="text-center text-gray-500 py-6">
                            {pastors.length > 0 ? "Aucun pasteur ne correspond à votre recherche." : "Aucun pasteur approuvé trouvé."}
                        </p>
                    )}
                </div>
                
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPastor?.uid ? 'Modifier Pasteur' : 'Ajouter Pasteur'}>
                    {editingPastor && <PastorForm pastor={editingPastor} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />}
                </Modal>

                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Supprimer Pasteur / Demande"
                    message={`Êtes-vous sûr de vouloir supprimer "${itemToDeleteName}" ? Cette action est irréversible.`}
                    confirmText="Supprimer"
                    isConfirming={isDeleting}
                />
            </div>
        </div>
    );
};

// Form sub-component
const PastorForm: React.FC<{ pastor: PastorData, onSave: (data: PastorData) => void, onCancel: () => void }> = ({ pastor, onSave, onCancel }) => {
    const [formData, setFormData] = useState(pastor);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRole = e.target.value as UserRole;
        setFormData(prev => ({ 
            ...prev, role: newRole,
            group: newRole === UserRole.REGIONAL_PASTOR ? '' : prev.group,
            district: (newRole === UserRole.REGIONAL_PASTOR || newRole === UserRole.GROUP_PASTOR) ? '' : prev.district,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className={labelClass}>Nom Complet</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} required disabled={!!formData.uid} />
            </div>
            <div>
                <label htmlFor="contact" className={labelClass}>Numéro de téléphone</label>
                <input 
                    type="tel" 
                    id="contact" 
                    name="contact" 
                    value={formData.contact || ''} 
                    onChange={handleChange} 
                    className={inputClass} 
                    placeholder="Ex: 0123456789"
                    pattern="01[0-9]{8}"
                    title="Le numéro doit contenir 10 chiffres et commencer par 01."
                />
            </div>
            {!formData.uid && (
                 <div>
                    <label htmlFor="password" className={labelClass}>Mot de Passe (min. 6 caractères)</label>
                    <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className={inputClass} required minLength={6} />
                 </div>
            )}
             <div>
                <label htmlFor="role" className={labelClass}>Rôle</label>
                <select id="role" name="role" value={formData.role} onChange={handleRoleChange} className={inputClass} required>
                    <option value={UserRole.REGIONAL_PASTOR}>Pasteur Régional</option>
                    <option value={UserRole.GROUP_PASTOR}>Pasteur de Groupe</option>
                    <option value={UserRole.DISTRICT_PASTOR}>Pasteur de District</option>
                </select>
            </div>
            
            {(formData.role === UserRole.REGIONAL_PASTOR || formData.role === UserRole.GROUP_PASTOR || formData.role === UserRole.DISTRICT_PASTOR) && (
                <div>
                    <label htmlFor="region" className={labelClass}>Région</label>
                    <select id="region" name="region" value={formData.region} onChange={handleChange} className={inputClass} required>
                         <option value="">-- Sélectionner une région --</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            )}

            {(formData.role === UserRole.GROUP_PASTOR || formData.role === UserRole.DISTRICT_PASTOR) && (
                 <div>
                    <label htmlFor="group" className={labelClass}>Groupe</label>
                    <input type="text" id="group" name="group" value={formData.group || ''} onChange={handleChange} className={inputClass} placeholder="Nom du groupe" required />
                </div>
            )}

             {formData.role === UserRole.DISTRICT_PASTOR && (
                 <div>
                    <label htmlFor="district" className={labelClass}>District</label>
                    <input type="text" id="district" name="district" value={formData.district || ''} onChange={handleChange} className={inputClass} placeholder="Nom du district" required />
                </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                    Annuler
                </button>
                 <button type="submit" disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 disabled:bg-blue-300">
                     {isSaving && <SpinnerIcon className="h-5 w-5"/>}
                     <span>Enregistrer</span>
                </button>
            </div>
        </form>
    );
};

export default PastorManagement;