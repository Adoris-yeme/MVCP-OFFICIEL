import React, { useState, useEffect, useMemo } from 'react';
import { District, Group } from '../types.ts';
import { api } from '../services/api.ts';
import { REGIONS } from '../constants.ts';
import { SpinnerIcon, PencilIcon, TrashIcon, PlusCircleIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const DistrictForm: React.FC<{ district: Partial<District>, onSave: (data: Omit<District, 'id'>, districtId?: string) => void, onCancel: () => void }> = ({ district, onSave, onCancel }) => {
    const [formData, setFormData] = useState(district);
    const [isSaving, setIsSaving] = useState(false);
    const [groupsInRegion, setGroupsInRegion] = useState<Group[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchGroups = async () => {
            if (formData.region) {
                const groups = await api.getGroups(formData.region);
                setGroupsInRegion(groups);
                // If the current group is not in the list for the new region, reset it
                if (!groups.some(g => g.name === formData.group)) {
                    setFormData(prev => ({ ...prev, group: '' }));
                }
            } else {
                setGroupsInRegion([]);
            }
        };
        fetchGroups();
    }, [formData.region]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.region || !formData.group || !formData.name) {
            showToast("Veuillez remplir tous les champs.", 'error');
            return;
        }
        setIsSaving(true);
        const { id, ...saveData } = formData;
        await onSave(saveData as Omit<District, 'id'>, id);
        setIsSaving(false);
    };
    
    const inputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="region" className={labelClass}>Région</label>
                <select id="region" name="region" value={formData.region || ''} onChange={handleChange} className={inputClass} required>
                    <option value="">-- Sélectionner une région --</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="group" className={labelClass}>Groupe</label>
                <select id="group" name="group" value={formData.group || ''} onChange={handleChange} className={inputClass} required disabled={!formData.region}>
                    <option value="">-- Sélectionner un groupe --</option>
                    {groupsInRegion.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="name" className={labelClass}>Nom du District</label>
                <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} className={inputClass} placeholder="Nom du district" required />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Annuler</button>
                <button type="submit" disabled={isSaving} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 disabled:bg-blue-300">
                    {isSaving && <SpinnerIcon className="h-5 w-5"/>}
                    <span>Enregistrer</span>
                </button>
            </div>
        </form>
    );
};

const DistrictManagement: React.FC = () => {
    const [districts, setDistricts] = useState<District[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<Partial<District> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemToDeleteName, setItemToDeleteName] = useState('');

    const fetchDistricts = async () => {
        try {
            setLoading(true);
            const fetchedDistricts = await api.getDistricts();
            setDistricts(fetchedDistricts);
        } catch (err: any) {
            showToast('Erreur lors du chargement des districts.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDistricts();
    }, []);

    const filteredDistricts = useMemo(() => {
        if (!searchTerm) return districts;
        const lowercasedFilter = searchTerm.toLowerCase();
        return districts.filter(d =>
            d.name.toLowerCase().includes(lowercasedFilter) ||
            d.group.toLowerCase().includes(lowercasedFilter) ||
            d.region.toLowerCase().includes(lowercasedFilter)
        );
    }, [districts, searchTerm]);

    const handleAdd = () => {
        setEditingDistrict({ region: '', group: '', name: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (district: District) => {
        setEditingDistrict(district);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = (districtId: string, districtName: string) => {
        setItemToDelete(districtId);
        setItemToDeleteName(districtName);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteDistrict(itemToDelete);
            showToast('District supprimé avec succès.', 'success');
            await fetchDistricts();
        } catch (err: any) {
            showToast(`Erreur : ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    
    const handleSave = async (data: Omit<District, 'id'>, districtId?: string) => {
        try {
            if (districtId) {
                await api.updateDistrict(districtId, data);
                showToast('District mis à jour.', 'success');
            } else {
                await api.addDistrict(data);
                showToast('District ajouté.', 'success');
            }
            setIsModalOpen(false);
            await fetchDistricts();
        } catch (err: any) {
            showToast(`Erreur : ${err.message}`, 'error');
        }
    };

    if (loading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-10 w-10 text-blue-600" /></div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <input
                    type="text"
                    placeholder="Rechercher un district..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="p-2 border rounded-md w-full md:w-auto flex-grow"
                 />
                 <button onClick={handleAdd} className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg w-full md:w-auto">
                     <PlusCircleIcon className="h-5 w-5"/>
                     <span>Ajouter un District</span>
                 </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                     <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">District</th>
                            <th className="px-6 py-3">Groupe</th>
                            <th className="px-6 py-3">Région</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDistricts.map(d => (
                             <tr key={d.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{d.name}</td>
                                <td className="px-6 py-4">{d.group}</td>
                                <td className="px-6 py-4">{d.region}</td>
                                <td className="px-6 py-4 flex justify-end items-center space-x-3">
                                    <button onClick={() => handleEdit(d)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full" title="Modifier"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => handleDeleteRequest(d.id, d.name)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" title="Supprimer"><TrashIcon className="h-5 w-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredDistricts.length === 0 && (
                    <p className="text-center text-gray-500 py-6">Aucun district trouvé.</p>
                )}
            </div>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDistrict?.id ? "Modifier le District" : "Ajouter un District"}>
                {editingDistrict && <DistrictForm district={editingDistrict} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />}
            </Modal>
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Supprimer le District"
                message={`Êtes-vous sûr de vouloir supprimer le district "${itemToDeleteName}" ? Les cellules de ce district ne seront plus associées.`}
                confirmText="Supprimer"
                isConfirming={isDeleting}
            />
        </div>
    );
};

export default DistrictManagement;