import React, { useState, useEffect, useMemo } from 'react';
import { User, Cell, UserRole, CellStatus } from '../types.ts';
import { api } from '../services/api.ts';
import { REGIONS, CELL_CATEGORIES } from '../constants.ts';
import { SpinnerIcon, PencilIcon, TrashIcon, PlusCircleIcon, ChevronRightIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';

const CELL_STATUSES: { value: CellStatus; label: string; color: string }[] = [
    { value: 'Active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'En implantation', label: 'En Implantation', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'En multiplication', label: 'En Multiplication', color: 'bg-blue-100 text-blue-800' },
    { value: 'En pause', label: 'En Pause', color: 'bg-gray-100 text-gray-800' },
];

// Modal Component (re-used from PastorManagement)
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

// Main Component
const CellManagement: React.FC<{ user: User }> = ({ user }) => {
    const [cells, setCells] = useState<Cell[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCell, setEditingCell] = useState<Partial<Cell> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemToDeleteName, setItemToDeleteName] = useState('');

    const [regionFilter, setRegionFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<CellStatus | 'all'>('all');
    const [expandedRegions, setExpandedRegions] = useState<{ [key: string]: boolean }>({});


    const fetchCells = async () => {
        try {
            setLoading(true);
            const fetchedCells = await api.getCellsForUser(user);
            setCells(fetchedCells);
        } catch (err: any) {
            showToast('Erreur lors du chargement des cellules.', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCells();
    }, [user]);

    const filteredCells = useMemo(() => {
        return cells.filter(c => {
            const matchesSearch = !searchTerm ||
                c.cellName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.leaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.group.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesRegion = regionFilter === 'all' || c.region === regionFilter;
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

            return matchesSearch && matchesRegion && matchesStatus;
        });
    }, [cells, searchTerm, regionFilter, statusFilter]);

    const groupedAndCountedCells = useMemo(() => {
        const result: { [key: string]: { cells: Cell[]; counts: { [key in CellStatus]: number } } } = {};

        filteredCells.forEach(cell => {
            if (!result[cell.region]) {
                result[cell.region] = {
                    cells: [],
                    counts: { 'Active': 0, 'En implantation': 0, 'En multiplication': 0, 'En pause': 0 }
                };
            }
            result[cell.region].cells.push(cell);
            result[cell.region].counts[cell.status]++;
        });
        
        return Object.entries(result).sort(([regionA], [regionB]) => regionA.localeCompare(regionB));

    }, [filteredCells]);


    const handleAdd = () => {
        const newCell: Partial<Cell> = {
            region: user.role !== UserRole.NATIONAL_COORDINATOR ? user.region : (regionFilter !== 'all' ? regionFilter : REGIONS[0]),
            group: user.role === UserRole.GROUP_PASTOR || user.role === UserRole.DISTRICT_PASTOR ? user.group : '',
            district: user.role === UserRole.DISTRICT_PASTOR ? user.district : '',
            cellCategory: CELL_CATEGORIES[0],
            status: 'Active',
        };
        setEditingCell(newCell);
        setIsModalOpen(true);
    };

    const handleEdit = (cell: Cell) => {
        setEditingCell(cell);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = (cellId: string, cellName: string) => {
        setItemToDelete(cellId);
        setItemToDeleteName(cellName);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteCell(itemToDelete);
            showToast('Cellule supprimée avec succès.', 'success');
            await fetchCells();
        } catch (err: any) {
            showToast(`Erreur lors de la suppression : ${err.message}`, 'error');
            console.error(err);
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    
    const handleSave = async (cellData: Omit<Cell, 'id'>, cellId?: string) => {
        try {
            if (cellId) {
                await api.updateCell(cellId, cellData);
                showToast('Cellule mise à jour avec succès.', 'success');
            } else {
                await api.addCell(cellData);
                showToast('Cellule ajoutée avec succès.', 'success');
            }
            setIsModalOpen(false);
            await fetchCells();
        } catch (err: any) {
            showToast(`Erreur lors de l'enregistrement : ${err.message}`, 'error');
        }
    };

    const toggleRegion = (regionName: string) => {
        setExpandedRegions(prev => ({...prev, [regionName]: !prev[regionName]}));
    };

    if (loading) return <div className="flex justify-center items-center p-10"><SpinnerIcon className="h-12 w-12 text-blue-700" /></div>;
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <input
                    type="text"
                    placeholder="Rechercher une cellule, responsable..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="p-2 border rounded-md w-full md:w-auto flex-grow"
                 />
                 <button onClick={handleAdd} className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg w-full md:w-auto">
                     <PlusCircleIcon className="h-5 w-5"/>
                     <span>Ajouter une Cellule</span>
                 </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                    <label htmlFor="regionFilter" className="block text-sm font-medium text-gray-700">Filtrer par Région</label>
                    <select id="regionFilter" value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="mt-1 w-full p-2 border rounded-md">
                        <option value="all">Toutes les régions</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Filtrer par Statut</label>
                    <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as CellStatus | 'all')} className="mt-1 w-full p-2 border rounded-md">
                        <option value="all">Tous les statuts</option>
                        {CELL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
            </div>
           
            <div className="space-y-4">
                {groupedAndCountedCells.map(([regionName, { cells: regionCells, counts }]) => (
                    <div key={regionName} className="border rounded-lg overflow-hidden">
                        <button onClick={() => toggleRegion(regionName)} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none">
                            <div className="flex items-center space-x-3">
                                <ChevronRightIcon className={`h-5 w-5 text-gray-600 transform transition-transform ${expandedRegions[regionName] ? 'rotate-90' : ''}`} />
                                <h3 className="font-bold text-lg text-gray-800">{regionName} ({regionCells.length} cellules)</h3>
                            </div>
                            <div className="hidden md:flex items-center space-x-4">
                                {Object.entries(counts).map(([status, count]) => {
                                    const statusInfo = CELL_STATUSES.find(s => s.value === status);
                                    if (count === 0) return null;
                                    return (
                                        <span key={status} className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.color}`}>
                                            {statusInfo?.label}: {count}
                                        </span>
                                    );
                                })}
                            </div>
                        </button>
                        {expandedRegions[regionName] && (
                            <div className="bg-white p-2">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-600">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3">Nom de la Cellule</th>
                                                <th className="px-4 py-3">Hiérarchie</th>
                                                <th className="px-4 py-3">Responsable</th>
                                                <th className="px-4 py-3">Statut</th>
                                                <th className="px-4 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {regionCells.map(cell => {
                                                const statusInfo = CELL_STATUSES.find(s => s.value === cell.status);
                                                return (
                                                    <tr key={cell.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium text-gray-900">{cell.cellName}</td>
                                                        <td className="px-4 py-3 text-xs">{`${cell.group} > ${cell.district}`}</td>
                                                        <td className="px-4 py-3">{cell.leaderName}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo?.color}`}>
                                                                {statusInfo?.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 flex justify-end items-center space-x-3">
                                                            <button onClick={() => handleEdit(cell)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full" title="Modifier"><PencilIcon className="h-5 w-5"/></button>
                                                            <button onClick={() => handleDeleteRequest(cell.id, cell.cellName)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" title="Supprimer"><TrashIcon className="h-5 w-5"/></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {groupedAndCountedCells.length === 0 && (
                     <p className="text-center text-gray-500 py-6">
                        {cells.length > 0 ? "Aucune cellule ne correspond à vos filtres." : "Aucune cellule trouvée pour votre zone de service."}
                    </p>
                )}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCell?.id ? 'Modifier la Cellule' : 'Ajouter une Cellule'}>
                {editingCell && <CellForm cell={editingCell} onSave={handleSave} onCancel={() => setIsModalOpen(false)} user={user} />}
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Supprimer la Cellule"
                message={`Êtes-vous sûr de vouloir supprimer la cellule "${itemToDeleteName}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                isConfirming={isDeleting}
            />
        </div>
    );
};

// Form sub-component
const CellForm: React.FC<{ cell: Partial<Cell>, onSave: (data: Omit<Cell, 'id'>, cellId?: string) => void, onCancel: () => void, user: User }> = ({ cell, onSave, onCancel, user }) => {
    const [formData, setFormData] = useState(cell);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (!formData.region || !formData.group || !formData.district || !formData.cellName || !formData.leaderName) {
            alert("Veuillez remplir tous les champs requis.");
            return;
        }
        setIsSaving(true);
        // The id is on the initial `cell` object but not in the `formData` type for saving
        const { id, ...saveData } = formData;
        await onSave(saveData as Omit<Cell, 'id'>, id);
        setIsSaving(false);
    };
    
    const inputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";
    const disabledInputClass = `${inputClass} bg-gray-100 cursor-not-allowed`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="region" className={labelClass}>Région</label>
                <select id="region" name="region" value={formData.region} onChange={handleChange} className={user.role !== UserRole.NATIONAL_COORDINATOR ? disabledInputClass : inputClass} disabled={user.role !== UserRole.NATIONAL_COORDINATOR} required>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="group" className={labelClass}>Groupe</label>
                <input type="text" id="group" name="group" value={formData.group || ''} onChange={handleChange} className={user.role === UserRole.GROUP_PASTOR || user.role === UserRole.DISTRICT_PASTOR ? disabledInputClass : inputClass} disabled={user.role === UserRole.GROUP_PASTOR || user.role === UserRole.DISTRICT_PASTOR} required />
            </div>
             <div>
                <label htmlFor="district" className={labelClass}>District</label>
                <input type="text" id="district" name="district" value={formData.district || ''} onChange={handleChange} className={user.role === UserRole.DISTRICT_PASTOR ? disabledInputClass : inputClass} disabled={user.role === UserRole.DISTRICT_PASTOR} required />
            </div>
             <div>
                <label htmlFor="cellName" className={labelClass}>Nom de la Cellule</label>
                <input type="text" id="cellName" name="cellName" value={formData.cellName || ''} onChange={handleChange} className={inputClass} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="cellCategory" className={labelClass}>Catégorie</label>
                    <select id="cellCategory" name="cellCategory" value={formData.cellCategory} onChange={handleChange} className={inputClass} required>
                        {CELL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className={labelClass}>Statut</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClass} required>
                        {CELL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
            </div>
             <div>
                <label htmlFor="leaderName" className={labelClass}>Nom du Responsable</label>
                <input type="text" id="leaderName" name="leaderName" value={formData.leaderName || ''} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
                <label htmlFor="leaderContact" className={labelClass}>Contact du Responsable</label>
                <input 
                    type="tel" 
                    id="leaderContact" 
                    name="leaderContact" 
                    value={formData.leaderContact || ''} 
                    onChange={handleChange} 
                    className={inputClass}
                    placeholder="Ex: 0123456789"
                    pattern="01[0-9]{8}"
                    title="Le numéro doit contenir 10 chiffres et commencer par 01."
                />
            </div>
            
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

export default CellManagement;