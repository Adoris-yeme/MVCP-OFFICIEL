import React, { useState, useMemo } from 'react';
import { Report, InvitedPerson, Visit } from '../types.ts';
import { api } from '../services/api.ts';
import { PlusCircleIcon, TrashIcon, SpinnerIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { REGIONS, CELL_CATEGORIES } from '../constants.ts';

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

type ReportDraft = Omit<Report, 'id' | 'submittedAt' | 'absentees' | 'totalPresent'>;

const initialDraft: ReportDraft = {
    cellDate: new Date().toISOString().split('T')[0],
    region: '',
    group: '',
    district: '',
    cellName: '',
    cellCategory: '',
    leaderName: '',
    leaderContact: '',
    registeredMen: 0,
    registeredWomen: 0,
    registeredChildren: 0,
    attendees: 0,
    invitedPeople: [],
    visitSchedule: '',
    visitsMade: [],
    bibleStudy: 0,
    miracleHour: 0,
    sundayServiceAttendance: 0,
    evangelismOuting: '',
    poignantTestimony: '',
    message: '',
};

const STEPS = [
  { id: 1, title: 'Identification' },
  { id: 2, title: 'Statistiques' },
  { id: 3, title: 'Activités' },
  { id: 4, title: 'Témoignages & Message' },
  { id: 5, title: 'Révision et Soumission' },
];

const ReportForm: React.FC = () => {
    const [formData, setFormData] = useLocalStorage<ReportDraft>('reportDraft', initialDraft);
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [step, setStep] = useState(1);
    const { showToast } = useToast();

    const calculatedStats = useMemo(() => {
        const registeredMembers = Number(formData.registeredMen) + Number(formData.registeredWomen) + Number(formData.registeredChildren);
        const absentees = Math.max(0, registeredMembers - Number(formData.attendees));
        const totalPresent = Number(formData.attendees) + formData.invitedPeople.length;
        return { registeredMembers, absentees, totalPresent };
    }, [formData]);

    // --- Change Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const finalValue = e.target.type === 'number' ? (parseInt(value, 10) || 0) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handleInvitedChange = (index: number, field: keyof Omit<InvitedPerson, 'id'>, value: string) => {
        const newInvited = [...formData.invitedPeople];
        newInvited[index] = { ...newInvited[index], [field]: value };
        setFormData(prev => ({ ...prev, invitedPeople: newInvited }));
    };
    const addInvited = () => setFormData(prev => ({...prev, invitedPeople: [...prev.invitedPeople, {id: `new-${Date.now()}`, name: '', contact: '', address: ''}]}));
    const removeInvited = (index: number) => setFormData(prev => ({...prev, invitedPeople: prev.invitedPeople.filter((_, i) => i !== index)}));
    
    const handleVisitChange = (index: number, field: keyof Omit<Visit, 'id'>, value: string) => {
        const newVisits = [...formData.visitsMade];
        newVisits[index] = { ...newVisits[index], [field]: value };
        setFormData(prev => ({ ...prev, visitsMade: newVisits }));
    };
    const addVisit = () => setFormData(prev => ({...prev, visitsMade: [...prev.visitsMade, {id: `visit-${Date.now()}`, name: '', subject: '', need: ''}]}));
    const removeVisit = (index: number) => setFormData(prev => ({...prev, visitsMade: prev.visitsMade.filter((_, i) => i !== index)}));

    const validateStep = (stepToValidate: number, redirectOnError: boolean = false): boolean => {
      if (stepToValidate === 1) {
        const { cellDate, region, group, district, cellName, leaderName } = formData;
        if (!cellDate || !region || !group || !district || !cellName || !leaderName) {
            showToast("Veuillez remplir toutes les informations d'identification.", 'error');
            if (redirectOnError) setStep(1);
            return false;
        }
      }
      if (stepToValidate === 2) {
        const registered = calculatedStats.registeredMembers;
        if (registered < Number(formData.attendees)) {
            showToast("Le nombre de présents ne peut être supérieur au nombre d'inscrits.", 'error');
            if (redirectOnError) setStep(2);
            return false;
        }
      }
      return true;
    }

    const nextStep = () => {
      if(validateStep(step)) {
        setStep(prev => Math.min(prev + 1, STEPS.length));
      }
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        for (let i = 1; i < STEPS.length; i++) {
            if (!validateStep(i, true)) {
                return;
            }
        }
        
        setStatus('loading');
        
        const reportToSubmit: Omit<Report, 'id' | 'submittedAt'> = {
            ...formData,
            absentees: calculatedStats.absentees,
            totalPresent: calculatedStats.totalPresent,
        };

        try {
            await api.submitReport(reportToSubmit);
            showToast('Rapport soumis avec succès!', 'success');
            setFormData({ ...initialDraft, cellDate: new Date().toISOString().split('T')[0] });
            window.localStorage.removeItem('reportDraft');
            setStep(1); // Reset to first step
        } catch (error) {
            showToast('Une erreur est survenue lors de la soumission.', 'error');
            console.error(error);
        } finally {
            setStatus('idle');
        }
    };
    
    const inputClass = "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";
    const sectionTitleClass = "text-xl font-semibold text-gray-700 border-b pb-2 mb-6";
    const buttonClass = "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-300";

    const renderIdentificationStep = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="cellDate" className={labelClass}>📅 Date de la cellule</label>
                    <input type="date" name="cellDate" id="cellDate" value={formData.cellDate} onChange={handleChange} className={inputClass} required />
                </div>
                 <div>
                    <label htmlFor="region" className={labelClass}>🌍 Région</label>
                    <select name="region" id="region" value={formData.region} onChange={handleChange} className={inputClass} required>
                        <option value="">-- Sélectionner --</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="group" className={labelClass}>Groupe</label>
                    <input type="text" name="group" id="group" value={formData.group} onChange={handleChange} className={inputClass} required placeholder="Ex: Groupe de Gbegamey" />
                </div>
                <div>
                    <label htmlFor="district" className={labelClass}>District</label>
                    <input type="text" name="district" id="district" value={formData.district} onChange={handleChange} className={inputClass} required placeholder="Ex: District de Cadjehoun" />
                </div>
                 <div>
                    <label htmlFor="cellName" className={labelClass}>Nom de la cellule</label>
                    <input type="text" name="cellName" id="cellName" value={formData.cellName} onChange={handleChange} className={inputClass} required placeholder="Ex: Cellule des Rachetés" />
                </div>
                 <div>
                    <label htmlFor="cellCategory" className={labelClass}>Catégorie de la cellule</label>
                    <select name="cellCategory" id="cellCategory" value={formData.cellCategory} onChange={handleChange} className={inputClass} required>
                         <option value="">-- Sélectionner --</option>
                         {CELL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
             <div className="p-4 bg-gray-50 rounded-lg border animate-fade-in">
                <h4 className="font-semibold text-gray-800">Informations du Responsable</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                       <label htmlFor="leaderName" className={labelClass}>Nom du Responsable</label>
                       <input type="text" name="leaderName" id="leaderName" value={formData.leaderName} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                       <label htmlFor="leaderContact" className={labelClass}>Contact du Responsable</label>
                       <input 
                           type="tel" 
                           name="leaderContact" 
                           id="leaderContact" 
                           value={formData.leaderContact} 
                           onChange={handleChange} 
                           className={inputClass} 
                           placeholder="Ex: 0123456789"
                           pattern="01[0-9]{8}"
                           title="Le numéro doit contenir 10 chiffres et commencer par 01."
                       />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-700">Veuillez vérifier les informations avant de soumettre.</h3>
            
            <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-bold text-gray-800 mb-2">Identification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p><strong className="text-gray-600">Date:</strong> {new Date(formData.cellDate).toLocaleDateString('fr-FR')}</p>
                    <p><strong className="text-gray-600">Région:</strong> {formData.region}</p>
                    <p><strong className="text-gray-600">Groupe:</strong> {formData.group}</p>
                    <p><strong className="text-gray-600">District:</strong> {formData.district}</p>
                    <p><strong className="text-gray-600">Cellule:</strong> {formData.cellName}</p>
                    <p><strong className="text-gray-600">Catégorie:</strong> {formData.cellCategory}</p>
                    <p className="sm:col-span-2"><strong className="text-gray-600">Responsable:</strong> {formData.leaderName} ({formData.leaderContact || 'N/A'})</p>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-bold text-gray-800 mb-2">Statistiques</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong className="text-gray-600">Total Inscrits:</strong> {calculatedStats.registeredMembers}</p>
                    <p><strong className="text-gray-600">Présents (inscrits):</strong> {formData.attendees}</p>
                    <p><strong className="text-gray-600">Absents (inscrits):</strong> {calculatedStats.absentees}</p>
                    <p><strong className="text-gray-600">Invités:</strong> {formData.invitedPeople.length}</p>
                    <p className="font-bold"><strong className="text-gray-600">Total ce Jour:</strong> {calculatedStats.totalPresent}</p>
                </div>
                 {formData.invitedPeople.length > 0 && <p className="text-xs mt-2 text-gray-500">Invités: {formData.invitedPeople.map(p => p.name).join(', ')}</p>}
            </div>
            
            <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-bold text-gray-800 mb-2">Activités</h4>
                 <div className="grid grid-cols-2 gap-2 text-sm">
                     <p><strong className="text-gray-600">Étude Biblique:</strong> {formData.bibleStudy}</p>
                     <p><strong className="text-gray-600">Heure de Miracle:</strong> {formData.miracleHour}</p>
                     <p><strong className="text-gray-600">Culte Dominical:</strong> {formData.sundayServiceAttendance}</p>
                     <p><strong className="text-gray-600">Visites effectuées:</strong> {formData.visitsMade.length}</p>
                </div>
            </div>
            
            {formData.poignantTestimony && <div className="p-4 border rounded-lg bg-yellow-50">
                 <h4 className="font-bold text-gray-800 mb-2">Témoignage Poignant</h4>
                 <p className="text-sm italic">"{formData.poignantTestimony}"</p>
            </div>}
        </div>
    );

    return (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Rapport Hebdomadaire de Cellule</h2>
        <p className="text-gray-600 mb-6">Remplissez tous les champs pour soumettre le rapport de votre cellule.</p>
        
        <div className="mb-8">
            <div className="flex items-center">
                {STEPS.map((s, index) => (
                    <React.Fragment key={s.id}>
                        <div className="flex items-center relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors duration-300 ${step >= s.id ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                {s.id}
                            </div>
                            <p className={`absolute top-10 text-xs text-center w-32 -left-12 font-semibold ${step >= s.id ? 'text-blue-600' : 'text-gray-400'}`}>{s.title}</p>
                        </div>
                        {index < STEPS.length - 1 && (
                            <div className={`flex-auto border-t-2 transition-colors duration-300 ${step > s.id ? 'border-blue-600' : 'border-gray-300'}`}></div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          
          {step === 1 && (
            <section className="space-y-6 animate-fade-in">
                <h3 className={sectionTitleClass}>Étape 1: Identification de la Cellule</h3>
                {renderIdentificationStep()}
            </section>
          )}
          
          {step === 2 && (
            <section className="space-y-6 animate-fade-in">
              <h3 className={sectionTitleClass}>Étape 2: Statistiques des membres</h3>
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-2">Membres Inscrits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 border rounded-md bg-gray-50">
                    <div>
                        <label htmlFor="registeredMen" className={labelClass}>👨 Hommes</label>
                        <input type="number" name="registeredMen" id="registeredMen" value={formData.registeredMen} onChange={handleChange} min="0" className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="registeredWomen" className={labelClass}>👩 Femmes</label>
                        <input type="number" name="registeredWomen" id="registeredWomen" value={formData.registeredWomen} onChange={handleChange} min="0" className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="registeredChildren" className={labelClass}>🧒 Enfants</label>
                        <input type="number" name="registeredChildren" id="registeredChildren" value={formData.registeredChildren} onChange={handleChange} min="0" className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="registeredTotal" className={labelClass}>∑ Total Inscrits</label>
                        <input type="number" name="registeredTotal" id="registeredTotal" value={calculatedStats.registeredMembers} className={`${inputClass} bg-gray-100 font-bold`} readOnly />
                    </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-2">Participation ce jour</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="attendees" className={labelClass}>✅ Présents (inscrits)</label>
                        <input type="number" name="attendees" id="attendees" value={formData.attendees} onChange={handleChange} min="0" className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="absentees" className={labelClass}>❌ Absents (inscrits)</label>
                        <input type="number" name="absentees" id="absentees" value={calculatedStats.absentees} className={`${inputClass} bg-gray-100`} readOnly />
                    </div>
                    <div>
                        <label htmlFor="totalPresent" className={labelClass}>🔢 Total ce jour</label>
                        <input type="number" name="totalPresent" id="totalPresent" value={calculatedStats.totalPresent} className={`${inputClass} bg-gray-100 font-bold`} readOnly />
                    </div>
                </div>
              </div>

              <div className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-gray-700">🆕 Personnes invitées</h4>
                      <button type="button" onClick={addInvited} className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                          <PlusCircleIcon className="h-5 w-5" /> <span>Ajouter</span>
                      </button>
                  </div>
                  {formData.invitedPeople.map((person, index) => (
                      <div key={person.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md relative bg-gray-50">
                          <input type="text" placeholder="Nom" value={person.name} onChange={e => handleInvitedChange(index, 'name', e.target.value)} className={inputClass}/>
                          <input 
                              type="tel" 
                              placeholder="Contact (Ex: 01...)" 
                              value={person.contact} 
                              onChange={e => handleInvitedChange(index, 'contact', e.target.value)} 
                              className={inputClass}
                              pattern="01[0-9]{8}"
                              title="Le numéro doit contenir 10 chiffres et commencer par 01."
                          />
                          <input type="text" placeholder="Adresse" value={person.address} onChange={e => handleInvitedChange(index, 'address', e.target.value)} className={`${inputClass} md:col-span-2`}/>
                          <button type="button" onClick={() => removeInvited(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                              <TrashIcon className="h-4 w-4" />
                          </button>
                      </div>
                  ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6 animate-fade-in">
              <h3 className={sectionTitleClass}>Étape 3: Activités et Participation</h3>
               <div>
                  <label htmlFor="visitSchedule" className={labelClass}>📆 Programme des visites</label>
                  <textarea name="visitSchedule" id="visitSchedule" value={formData.visitSchedule} onChange={handleChange} rows={2} className={inputClass}></textarea>
               </div>
               <div className="flex justify-between items-center">
                  <h4 className="text-md font-semibold text-gray-700">🤝 Visites effectuées</h4>
                  <button type="button" onClick={addVisit} className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                      <PlusCircleIcon className="h-5 w-5" /> <span>Ajouter</span>
                  </button>
              </div>
              {formData.visitsMade.map((visit, index) => (
                  <div key={visit.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md relative bg-gray-50">
                      <input type="text" placeholder="Nom de la personne" value={visit.name} onChange={e => handleVisitChange(index, 'name', e.target.value)} className={inputClass}/>
                      <input type="text" placeholder="Sujet" value={visit.subject} onChange={e => handleVisitChange(index, 'subject', e.target.value)} className={inputClass}/>
                      <input type="text" placeholder="Besoin exprimé" value={visit.need} onChange={e => handleVisitChange(index, 'need', e.target.value)} className={`${inputClass} md:col-span-2`}/>
                      <button type="button" onClick={() => removeVisit(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                          <TrashIcon className="h-4 w-4" />
                      </button>
                  </div>
              ))}
              <div className="pt-6 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-700">Participation (nombre de personnes)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                          <label className={labelClass}>📖 Étude biblique</label>
                          <input type="number" name="bibleStudy" value={formData.bibleStudy} onChange={handleChange} className={inputClass} min="0" />
                      </div>
                      <div>
                          <label className={labelClass}>⏰ Heure de réveil & miracle</label>
                          <input type="number" name="miracleHour" value={formData.miracleHour} onChange={handleChange} className={inputClass} min="0" />
                      </div>
                      <div>
                          <label htmlFor="sundayServiceAttendance" className={labelClass}>⛪ Culte dominical</label>
                          <input type="number" id="sundayServiceAttendance" name="sundayServiceAttendance" value={formData.sundayServiceAttendance} onChange={handleChange} className={inputClass} min="0" />
                      </div>
                  </div>
                  <div className="mt-6">
                      <label htmlFor="evangelismOuting" className={labelClass}>📢 Sortie d'évangélisation (décrire)</label>
                      <input type="text" id="evangelismOuting" name="evangelismOuting" value={formData.evangelismOuting} onChange={handleChange} className={inputClass} placeholder="Ex: 2 sorties, 5 âmes gagnées" />
                  </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6 animate-fade-in">
              <h3 className={sectionTitleClass}>Étape 4: Témoignages & Message</h3>
              <div>
                  <label htmlFor="poignantTestimony" className={labelClass}>✨ Témoignage poignant</label>
                  <textarea name="poignantTestimony" id="poignantTestimony" value={formData.poignantTestimony} onChange={handleChange} rows={5} className={`${inputClass} bg-yellow-50`} placeholder="Partagez un témoignage marquant (guérison, bénédiction...). Il pourra être mis en avant."></textarea>
              </div>
               <label htmlFor="message" className={labelClass}>💬 Message au coordinateur (facultatif)</label>
               <textarea name="message" id="message" value={formData.message} onChange={handleChange} rows={4} className={inputClass}></textarea>
            </section>
          )}
          
          {step === 5 && (
            <section className="space-y-6 animate-fade-in">
                <h3 className={sectionTitleClass}>Étape 5: Révision et Soumission</h3>
                {renderReviewStep()}
            </section>
          )}

          <div className="pt-5 flex justify-between">
              {step > 1 && (
                  <button type="button" onClick={prevStep} className={`${buttonClass} bg-gray-600 hover:bg-gray-700`}>
                      Précédent
                  </button>
              )}
              {step < STEPS.length && (
                   <button type="button" onClick={nextStep} className={`${buttonClass} ml-auto`}>
                      Suivant
                  </button>
              )}
              {step === STEPS.length && (
                  <button type="submit" disabled={status === 'loading'} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg focus:outline-none focus:shadow-outline disabled:bg-green-300 transition-colors duration-300 flex justify-center items-center space-x-2 ml-auto">
                      {status === 'loading' && <SpinnerIcon className="h-5 w-5" />}
                      <span>{status === 'loading' ? 'Soumission...' : 'Soumettre le Rapport'}</span>
                  </button>
              )}
          </div>
        </form>
      </div>
    );
};

export default ReportForm;