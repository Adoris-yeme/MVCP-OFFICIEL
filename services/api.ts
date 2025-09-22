import { Report, User, UserRole, PastorData, Cell, District, Group, Event, Resource, CellStatus } from '../types.ts';
import { REGIONS, CELL_CATEGORIES } from '../constants.ts';

// --- LOCAL STORAGE HELPERS ---
export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const setLocalStorageItem = <T>(key: string, value: T): void => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};

// --- MOCK DATA FOR INITIALIZATION ---
const MOCK_ADMIN_USER: User = {
    uid: 'local_admin_01',
    email: 'adoris.ye@gmail.com',
    name: 'Adoris YE',
    role: UserRole.NATIONAL_COORDINATOR,
    status: 'approved',
    password: 'GOD@2020',
};

const generateInitialData = () => {
    const users: User[] = [MOCK_ADMIN_USER];
    const groups: Group[] = [];
    const districts: District[] = [];
    const cells: Cell[] = [];
    const reports: Report[] = [];
    const events: Event[] = [];
    const resources: Resource[] = [];

    let userIdCounter = 1;
    let groupIdCounter = 1;
    let districtIdCounter = 1;
    let cellIdCounter = 1;
    let reportIdCounter = 1;

    // Helper for new 10-digit phone numbers
    const generatePhoneNumber = () => `01${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
    const cellStatuses: CellStatus[] = ['Active', 'En implantation', 'En multiplication', 'En pause'];

    // --- GENERATE HIERARCHY FOR ALL REGIONS ---
    REGIONS.forEach(region => {
        // Create 2-4 groups per region
        const groupNames = ["Alpha", "Omega", "Bethel", "Silo"].slice(0, Math.floor(Math.random() * 3) + 2);
        
        // Add Regional Pastor
        users.push({
            uid: `user-${userIdCounter++}`, email: `${region.toLowerCase().replace(/\s/g, '')}@mvcp.org`, name: `Pasteur ${region}`,
            role: UserRole.REGIONAL_PASTOR, region: region, status: 'approved', password: 'password123',
            contact: generatePhoneNumber()
        });

        groupNames.forEach(groupName => {
            const group: Group = { id: `group-${groupIdCounter++}`, region, name: groupName };
            groups.push(group);
            
            // Add Group Pastor
            users.push({
                uid: `user-${userIdCounter++}`, email: `${region.substring(0,3).toLowerCase()}${groupName.toLowerCase()}@mvcp.org`, name: `Pasteur ${groupName} (${region.substring(0,3)})`,
                role: UserRole.GROUP_PASTOR, region: region, group: groupName, status: 'approved', password: 'password123',
                contact: generatePhoneNumber()
            });

            // Create 2-3 districts per group
            const districtNames = ["Centre", "Est", "Ouest", "Sud"].slice(0, Math.floor(Math.random() * 2) + 2);
            districtNames.forEach(districtName => {
                const fullDistrictName = `${districtName} ${groupName}`;
                const district: District = { id: `dist-${districtIdCounter++}`, region, group: groupName, name: fullDistrictName };
                districts.push(district);
                
                // Add District Pastor
                users.push({
                    uid: `user-${userIdCounter++}`, email: `${fullDistrictName.toLowerCase().replace(/\s/g, '')}@mvcp.org`, name: `Pasteur ${fullDistrictName}`,
                    role: UserRole.DISTRICT_PASTOR, region: region, group: groupName, district: fullDistrictName, status: 'approved', password: 'password123',
                    contact: generatePhoneNumber()
                });
                
                // Add 2-4 cells per district
                for (let i = 0; i < (Math.floor(Math.random() * 3) + 2); i++) {
                    const cellNames = ["Source de Vie", "Phare Divin", "Les Vainqueurs", "Etoile du Matin", "Rocher des Siècles"];
                    const leaders = ["Jean Akpo", "Grace Houessou", "David Abalo", "Esther Dossou", "Paul Zinsou"];
                    
                    const cell: Cell = {
                        id: `cell-${cellIdCounter++}`, region, group: groupName, district: fullDistrictName,
                        cellName: `${cellNames[Math.floor(Math.random() * cellNames.length)]} ${i+1}`,
                        cellCategory: CELL_CATEGORIES[Math.floor(Math.random() * CELL_CATEGORIES.length)],
                        leaderName: leaders[Math.floor(Math.random() * leaders.length)],
                        leaderContact: generatePhoneNumber(),
                        status: cellStatuses[Math.floor(Math.random() * cellStatuses.length)],
                    };
                    cells.push(cell);
                }
            });
        });
    });

    // --- GENERATE REPORTS for the last 3 months ---
    const today = new Date();
    const testimonies = [
        "Témoignage de guérison miraculeuse après une prière intense.", "Une bénédiction financière inattendue a permis de payer les frais de scolarité.",
        "Réconciliation familiale grâce à la parole partagée en cellule.", "Un membre a trouvé un nouvel emploi après intercession.",
        "Le Seigneur a protégé une famille d'un grave accident."
    ];
    
    // Regions for trend demonstration
    const decliningRegions = ["Mono", "Zou", "Atacora"];
    const growingRegions = ["Littoral", "Atlantique sud", "Borgou"];
    const stagnatingRegions = ["Couffo", "Plateau"];

    cells.forEach(cell => {
        const totalReportsToGenerate = 12; // ~3 months
        for (let i = 0; i < totalReportsToGenerate; i++) {
            const reportDate = new Date(today);
            reportDate.setDate(today.getDate() - (i * 7 + Math.floor(Math.random() * 3)));

            const registeredMen = Math.floor(Math.random() * 10) + 5;
            const registeredWomen = Math.floor(Math.random() * 12) + 8;
            const registeredChildren = Math.floor(Math.random() * 15) + 3;
            const totalRegistered = registeredMen + registeredWomen + registeredChildren;
            
            let baseAttendees = Math.floor(Math.random() * (totalRegistered * 0.8)) + Math.floor(totalRegistered * 0.1);
            
            // Skew data for trend analysis demonstration
            // The logic `(totalReportsToGenerate - i)` makes recent reports (small i) have a larger modifier.
            if (decliningRegions.includes(cell.region)) {
                // Decrease attendance for recent reports
                baseAttendees -= Math.floor((totalReportsToGenerate - i) / 2.5);
            } else if (growingRegions.includes(cell.region)) {
                // Increase attendance for recent reports significantly
                 baseAttendees += Math.floor((totalReportsToGenerate - i) / 2);
            } else if (stagnatingRegions.includes(cell.region)) {
                // No change, data remains random and thus "stagnant" on average
            } else {
                // All other regions have slight organic growth
                baseAttendees += Math.floor((totalReportsToGenerate - i) / 4);
            }
            
            const attendees = Math.max(3, Math.min(totalRegistered, baseAttendees)); // Clamp value
            const absentees = totalRegistered - attendees;
            
            const invitedPeopleCount = Math.floor(Math.random() * 4);
            const invitedPeople = Array.from({ length: invitedPeopleCount }, (_, k) => ({
                id: `invited-${reportIdCounter}-${k}`, name: `Invité ${k+1}`, contact: generatePhoneNumber(), address: `Quartier ${k+1}`
            }));

            const visitsMadeCount = Math.floor(Math.random() * 3);
            const visitsMade = Array.from({ length: visitsMadeCount }, (_, k) => ({
                id: `visit-${reportIdCounter}-${k}`, name: `Personne Visitée ${k+1}`, subject: ["Prière", "Encouragement", "Suivi"][Math.floor(Math.random() * 3)],
                need: ["Soutien spirituel", "Aide matérielle", "Conseils"][Math.floor(Math.random() * 3)]
            }));
            
            const totalPresent = attendees + invitedPeopleCount;

            const report: Report = {
                id: `report-${reportIdCounter++}`, cellDate: reportDate.toISOString().split('T')[0], region: cell.region, group: cell.group, district: cell.district,
                cellName: cell.cellName, cellCategory: cell.cellCategory, leaderName: cell.leaderName, leaderContact: cell.leaderContact!,
                registeredMen, registeredWomen, registeredChildren, attendees, absentees, invitedPeople, totalPresent,
                visitSchedule: "Visites prévues mardi et jeudi.", visitsMade, bibleStudy: Math.floor(Math.random() * totalPresent),
                miracleHour: Math.floor(Math.random() * totalPresent), sundayServiceAttendance: Math.floor(Math.random() * totalPresent),
                evangelismOuting: Math.random() > 0.7 ? "Sortie de groupe le Samedi" : "Aucune",
                poignantTestimony: Math.random() > 0.8 ? testimonies[Math.floor(Math.random() * testimonies.length)] : "",
                message: Math.random() > 0.9 ? "Le groupe a besoin de plus de bibles." : "",
                submittedAt: new Date(reportDate.getTime() + Math.random() * 1000 * 3600 * 24).toISOString()
            };
            reports.push(report);
        }
    });

    // --- GENERATE MOCK EVENTS ---
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    events.push({
        id: 'evt-1', title: 'Convention Nationale 2024',
        description: 'Rassemblement annuel de tous les fidèles du MVCP-BENIN pour un temps de prière, d\'enseignement et de communion.',
        date: nextMonth.toISOString(), location: 'Palais des Congrès, Cotonou', status: 'published',
        imageUrl: 'https://images.unsplash.com/photo-1579808463832-6a4a63f4a363?q=80&w=2070&auto=format&fit=crop'
    });
     events.push({
        id: 'evt-2', title: 'Séminaire de Formation des Responsables',
        description: 'Session de formation intensive pour tous les responsables de cellules sur le thème "Le leadership serviteur".',
        date: nextWeek.toISOString(), location: 'Siège National, Cotonou', status: 'published',
        imageUrl: 'https://images.unsplash.com/photo-1529070412935-6f299845431d?q=80&w=2070&auto=format&fit=crop'
    });
    events.push({
        id: 'evt-3', title: 'Préparation Journée d\'Évangélisation',
        description: 'Réunion de planification pour la grande journée d\'évangélisation nationale.',
        date: new Date().toISOString(), location: 'En ligne (Zoom)', status: 'draft'
    });

    return { reports, users, cells, districts, groups, events, resources };
};


const getInitialData = () => {
    return generateInitialData();
};

// --- INITIALIZE LOCAL STORAGE IF EMPTY ---
const initializeStorage = () => {
    if (localStorage.getItem('mvcp_data_initialized_v5') === null) { // Changed key to force re-init
        console.log("Initializing local storage with a rich set of mock data for all regions...");
        const initialData = getInitialData();
        setLocalStorageItem('reports', initialData.reports);
        setLocalStorageItem('users', initialData.users);
        setLocalStorageItem('cells', initialData.cells);
        setLocalStorageItem('districts', initialData.districts);
        setLocalStorageItem('groups', initialData.groups);
        setLocalStorageItem('events', initialData.events);
        setLocalStorageItem('resources', initialData.resources);
        localStorage.setItem('mvcp_data_initialized_v5', 'true');
    }
};

initializeStorage();


// --- API FUNCTIONS (LOCAL STORAGE VERSION) ---
export const api = {
  // --- AUTHENTICATION ---
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    const user = getLocalStorageItem<User | null>('currentUser', null);
    callback(user);
    return () => {};
  },
  
  login: async (email: string, pass: string): Promise<User> => {
    const users = getLocalStorageItem<User[]>('users', []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);

    if (!user) throw new Error("Email ou mot de passe incorrect.");
    if (user.status !== 'approved') throw new Error("Votre compte est en attente d'approbation.");

    setLocalStorageItem('currentUser', user);
    return user;
  },
  
  logout: () => {
    localStorage.removeItem('currentUser');
    return Promise.resolve();
  },
  
  registerPastor: async (pastorData: PastorData): Promise<{success: boolean; message: string}> => {
    const users = getLocalStorageItem<User[]>('users', []);
    if (users.some(u => u.email.toLowerCase() === pastorData.email.toLowerCase())) {
        return { success: false, message: "Un utilisateur avec cet email existe déjà." };
    }
    const newUser: User = { uid: `user-${Date.now()}`, ...pastorData, status: 'pending' };
    users.push(newUser);
    setLocalStorageItem('users', users);
    return { success: true, message: "Inscription réussie. Votre compte est en attente d'approbation."};
  },
  
  resetPassword: (email: string) => {
    alert(`En mode local, la réinitialisation de mot de passe n'est pas possible. Contactez le Coordinateur National.`);
    return Promise.resolve();
  },

  // --- REPORT MANAGEMENT ---
  submitReport: async (report: Omit<Report, 'id' | 'submittedAt'>) => {
    const reports = getLocalStorageItem<Report[]>('reports', []);
    const newReport: Report = { ...report, id: `report-${Date.now()}`, submittedAt: new Date().toISOString() };
    reports.push(newReport);
    setLocalStorageItem('reports', reports);
    return { id: newReport.id };
  },

  getReports: async (user: User, dateRange: { start: string, end: string }): Promise<Report[]> => {
    let reports = getLocalStorageItem<Report[]>('reports', []);
    reports = reports.filter(r => r.cellDate >= dateRange.start && r.cellDate <= dateRange.end);
    switch (user.role) {
        case UserRole.REGIONAL_PASTOR: reports = reports.filter(r => r.region === user.region); break;
        case UserRole.GROUP_PASTOR: reports = reports.filter(r => r.region === user.region && r.group === user.group); break;
        case UserRole.DISTRICT_PASTOR: reports = reports.filter(r => r.region === user.region && r.group === user.group && r.district === user.district); break;
    }
    return Promise.resolve(reports.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
  },

  deleteReport: (reportId: string) => {
    let reports = getLocalStorageItem<Report[]>('reports', []);
    reports = reports.filter(r => r.id !== reportId);
    setLocalStorageItem('reports', reports);
    return Promise.resolve();
  },

  // --- PASTOR (USER) MANAGEMENT ---
  getPendingPastors: (): Promise<User[]> => Promise.resolve(getLocalStorageItem<User[]>('users', []).filter(u => u.status === 'pending')),
  getPastors: (): Promise<User[]> => Promise.resolve(getLocalStorageItem<User[]>('users', []).filter(u => u.status === 'approved' && u.role !== UserRole.NATIONAL_COORDINATOR)),
  
  approvePastor: (uid: string): Promise<void> => {
    let users = getLocalStorageItem<User[]>('users', []);
    users = users.map(u => u.uid === uid ? { ...u, status: 'approved' } : u);
    setLocalStorageItem('users', users);
    return Promise.resolve();
  },
  
  addPastor: (pastorData: PastorData) => {
      const users = getLocalStorageItem<User[]>('users', []);
      const newUser: User = { ...pastorData, uid: `user-${Date.now()}`, status: 'approved' };
      users.push(newUser);
      setLocalStorageItem('users', users);
      return Promise.resolve(newUser);
  },

  updatePastor: (uid: string, pastorData: PastorData) => {
    let users = getLocalStorageItem<User[]>('users', []);
    const { password, ...restData } = pastorData;
    users = users.map(u => u.uid === uid ? { ...u, ...restData } : u);
    setLocalStorageItem('users', users);
    return Promise.resolve();
  },

  deletePastor: (uid: string) => {
    setLocalStorageItem('users', getLocalStorageItem<User[]>('users', []).filter(u => u.uid !== uid));
    return Promise.resolve();
  },

  // --- CELL MANAGEMENT ---
  getCellsForUser: async (user: User): Promise<Cell[]> => {
    let cells = getLocalStorageItem<Cell[]>('cells', []);
     switch (user.role) {
        case UserRole.REGIONAL_PASTOR: cells = cells.filter(c => c.region === user.region); break;
        case UserRole.GROUP_PASTOR: cells = cells.filter(c => c.region === user.region && c.group === user.group); break;
        case UserRole.DISTRICT_PASTOR: cells = cells.filter(c => c.region === user.region && c.group === user.group && c.district === user.district); break;
    }
    return Promise.resolve(cells);
  },
  addCell: async (cellData: Omit<Cell, 'id'>): Promise<Cell> => {
      const cells = getLocalStorageItem<Cell[]>('cells', []);
      const newCell = { id: `cell-${Date.now()}`, ...cellData };
      cells.push(newCell);
      setLocalStorageItem('cells', cells);
      return Promise.resolve(newCell);
  },
  updateCell: (cellId: string, cellData: Omit<Cell, 'id'>): Promise<void> => {
      let cells = getLocalStorageItem<Cell[]>('cells', []);
      cells = cells.map(c => c.id === cellId ? { id: c.id, ...cellData } : c);
      setLocalStorageItem('cells', cells);
      return Promise.resolve();
  },
  deleteCell: (cellId: string): Promise<void> => {
    setLocalStorageItem('cells', getLocalStorageItem<Cell[]>('cells', []).filter(c => c.id !== cellId));
    return Promise.resolve();
  },

  // --- GROUP MANAGEMENT ---
  getGroups: async (region?: string): Promise<Group[]> => {
    let groups = getLocalStorageItem<Group[]>('groups', []);
    if (region) {
      groups = groups.filter(g => g.region === region);
    }
    groups.sort((a,b) => (a.region + a.name).localeCompare(b.region + b.name));
    return Promise.resolve(groups);
  },
  addGroup: async (groupData: Omit<Group, 'id'>): Promise<Group> => {
    const groups = getLocalStorageItem<Group[]>('groups', []);
    if (groups.some(g => g.region === groupData.region && g.name.toLowerCase() === groupData.name.toLowerCase())) {
        throw new Error("Un groupe avec ce nom existe déjà dans cette région.");
    }
    const newGroup = { id: `grp-${Date.now()}`, ...groupData };
    groups.push(newGroup);
    setLocalStorageItem('groups', groups);
    return Promise.resolve(newGroup);
  },
  updateGroup: async (groupId: string, groupData: Omit<Group, 'id'>): Promise<void> => {
    let groups = getLocalStorageItem<Group[]>('groups', []);
    const oldGroup = groups.find(g => g.id === groupId);
    if (!oldGroup) throw new Error("Groupe non trouvé.");

    // Cascade update
    const newGroupName = groupData.name;
    const oldGroupName = oldGroup.name;
    const region = oldGroup.region;
    
    if (newGroupName !== oldGroupName || groupData.region !== region) {
        // Districts
        let districts = getLocalStorageItem<District[]>('districts', []);
        districts.forEach(d => { if (d.region === region && d.group === oldGroupName) d.group = newGroupName; });
        setLocalStorageItem('districts', districts);
        // Cells
        let cells = getLocalStorageItem<Cell[]>('cells', []);
        cells.forEach(c => { if (c.region === region && c.group === oldGroupName) c.group = newGroupName; });
        setLocalStorageItem('cells', cells);
        // Reports
        let reports = getLocalStorageItem<Report[]>('reports', []);
        reports.forEach(r => { if (r.region === region && r.group === oldGroupName) r.group = newGroupName; });
        setLocalStorageItem('reports', reports);
        // Users
        let users = getLocalStorageItem<User[]>('users', []);
        users.forEach(u => { if (u.region === region && u.group === oldGroupName) u.group = newGroupName; });
        setLocalStorageItem('users', users);
    }
    
    groups = groups.map(g => g.id === groupId ? { id: g.id, ...groupData } : g);
    setLocalStorageItem('groups', groups);
    return Promise.resolve();
  },
  deleteGroup: async (groupId: string): Promise<void> => {
    const groups = getLocalStorageItem<Group[]>('groups', []);
    const groupToDelete = groups.find(g => g.id === groupId);
    if (!groupToDelete) return Promise.resolve();
    
    const districts = getLocalStorageItem<District[]>('districts', []);
    if (districts.some(d => d.region === groupToDelete.region && d.group === groupToDelete.name)) {
        throw new Error("Impossible de supprimer ce groupe car il contient des districts.");
    }
    setLocalStorageItem('groups', groups.filter(g => g.id !== groupId));
    return Promise.resolve();
  },

  // --- DISTRICT MANAGEMENT ---
  getDistricts: async (): Promise<District[]> => {
    const districts = getLocalStorageItem<District[]>('districts', []);
    districts.sort((a,b) => (a.region + a.group + a.name).localeCompare(b.region + b.group + b.name));
    return Promise.resolve(districts);
  },
  addDistrict: async (districtData: Omit<District, 'id'>): Promise<District> => {
    const districts = getLocalStorageItem<District[]>('districts', []);
    const newDistrict = { id: `dist-${Date.now()}`, ...districtData };
    districts.push(newDistrict);
    setLocalStorageItem('districts', districts);
    return Promise.resolve(newDistrict);
  },
  updateDistrict: (districtId: string, districtData: Omit<District, 'id'>): Promise<void> => {
    let districts = getLocalStorageItem<District[]>('districts', []);
    districts = districts.map(d => d.id === districtId ? { id: d.id, ...districtData } : d);
    setLocalStorageItem('districts', districts);
    return Promise.resolve();
  },
  deleteDistrict: (districtId: string): Promise<void> => {
    const districts = getLocalStorageItem<District[]>('districts', []);
    const districtToDelete = districts.find(d => d.id === districtId);
    if (!districtToDelete) return Promise.resolve();

    const cells = getLocalStorageItem<Cell[]>('cells', []);
    if (cells.some(c => c.region === districtToDelete.region && c.group === districtToDelete.group && c.district === districtToDelete.name)) {
        throw new Error("Impossible de supprimer ce district car il contient des cellules de maison.");
    }

    setLocalStorageItem('districts', districts.filter(d => d.id !== districtId));
    return Promise.resolve();
  },

  // --- EVENT MANAGEMENT ---
  getEvents: async (): Promise<Event[]> => {
      let events = getLocalStorageItem<Event[]>('events', []);
      const now = new Date();
      // 8 days in milliseconds
      const eightDaysInMs = 8 * 24 * 60 * 60 * 1000; 

      const activeEvents = events.filter(e => {
        if (e.status === 'draft') {
            return true; // Always keep drafts
        }
        const eventDate = new Date(e.date);
        
        // Remove event if it ended more than 7 days ago
        if (now.getTime() - eventDate.getTime() > eightDaysInMs) {
            return false;
        }
        return true;
      });

      if (activeEvents.length < events.length) {
          setLocalStorageItem('events', activeEvents);
      }
      
      return Promise.resolve(activeEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  },
  getPublicEvents: async (): Promise<Event[]> => {
      const events = getLocalStorageItem<Event[]>('events', []);
      const now = new Date();
      const oneDayInMs = 24 * 60 * 60 * 1000;

      const publishedAndUpcoming = events.filter(e => {
          if (e.status !== 'published') return false;
          
          const eventDate = new Date(e.date);
          // Event is visible for its full day (UTC).
          return now.getTime() < (eventDate.getTime() + oneDayInMs);
      });
      return Promise.resolve(publishedAndUpcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  },
  addEvent: async (eventData: Omit<Event, 'id'>): Promise<Event> => {
      const events = getLocalStorageItem<Event[]>('events', []);
      const newEvent = { id: `evt-${Date.now()}`, ...eventData };
      events.push(newEvent);
      setLocalStorageItem('events', events);
      return Promise.resolve(newEvent);
  },
  updateEvent: async (eventId: string, eventData: Omit<Event, 'id'>): Promise<void> => {
      let events = getLocalStorageItem<Event[]>('events', []);
      events = events.map(e => e.id === eventId ? { id: e.id, ...eventData } : e);
      setLocalStorageItem('events', events);
      return Promise.resolve();
  },
  deleteEvent: async (eventId: string): Promise<void> => {
      let events = getLocalStorageItem<Event[]>('events', []);
      events = events.filter(e => e.id !== eventId);
      setLocalStorageItem('events', events);
      return Promise.resolve();
  },

  // --- PUBLIC PAGE DATA ---
  setFeaturedTestimony: async (reportId: string): Promise<void> => {
      setLocalStorageItem('featured_testimony_id', reportId);
      return Promise.resolve();
  },
  unfeatureTestimony: async (): Promise<void> => {
      localStorage.removeItem('featured_testimony_id');
      return Promise.resolve();
  },
  getFeaturedTestimony: async (): Promise<Report | null> => {
      const featuredId = getLocalStorageItem<string | null>('featured_testimony_id', null);
      if (!featuredId) {
          return Promise.resolve(null);
      }
      const reports = getLocalStorageItem<Report[]>('reports', []);
      const featuredReport = reports.find(r => r.id === featuredId);
      return Promise.resolve(featuredReport || null);
  },
  getRandomPoignantTestimony: async (): Promise<Report | null> => {
      const reports = getLocalStorageItem<Report[]>('reports', []);
      const testimonies = reports.filter(r => r.poignantTestimony && r.poignantTestimony.trim() !== '');
      if (testimonies.length === 0) {
          return Promise.resolve(null);
      }
      const randomIndex = Math.floor(Math.random() * testimonies.length);
      return Promise.resolve(testimonies[randomIndex]);
  },

  // --- RESOURCE MANAGEMENT ---
  getResources: (): Promise<Resource[]> => {
      return Promise.resolve(getLocalStorageItem<Resource[]>('resources', []).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
  },
  addResource: async (resource: Omit<Resource, 'id' | 'uploadedAt'>): Promise<Resource> => {
      const resources = getLocalStorageItem<Resource[]>('resources', []);
      const newResource = {
          ...resource,
          id: `res-${Date.now()}`,
          uploadedAt: new Date().toISOString(),
      };
      resources.push(newResource);
      setLocalStorageItem('resources', resources);
      return Promise.resolve(newResource);
  },
  deleteResource: async (resourceId: string): Promise<void> => {
      let resources = getLocalStorageItem<Resource[]>('resources', []);
      resources = resources.filter(r => r.id !== resourceId);
      setLocalStorageItem('resources', resources);
      return Promise.resolve();
  },
};