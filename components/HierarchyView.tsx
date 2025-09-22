import React, { useState, useEffect, useMemo } from 'react';
import { getLocalStorageItem } from '../services/api.ts';
import { Group, District, Cell } from '../types.ts';
import { SpinnerIcon, FolderIcon, DocumentDuplicateIcon, ChevronRightIcon } from './icons.tsx';
import { REGIONS } from '../constants.ts';

type HierarchyNode = {
    [region: string]: {
        [group: string]: {
            [district: string]: Cell[]
        }
    }
};

const HierarchyView: React.FC = () => {
    const [hierarchy, setHierarchy] = useState<HierarchyNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        try {
            // Fetch all data directly from localStorage for performance
            const allGroups = getLocalStorageItem<Group[]>('groups', []);
            const allDistricts = getLocalStorageItem<District[]>('districts', []);
            const allCells = getLocalStorageItem<Cell[]>('cells', []);

            const structuredData: HierarchyNode = {};

            REGIONS.forEach(region => {
                structuredData[region] = {};
                const regionGroups = allGroups.filter(g => g.region === region);
                
                regionGroups.forEach(group => {
                    structuredData[region][group.name] = {};
                    const groupDistricts = allDistricts.filter(d => d.region === region && d.group === group.name);
                    
                    groupDistricts.forEach(district => {
                        const districtCells = allCells.filter(c => c.region === region && c.group === group.name && c.district === district.name);
                        structuredData[region][group.name][district.name] = districtCells;
                    });
                });
            });

            setHierarchy(structuredData);
        } catch (error) {
            console.error("Error building hierarchy:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleExpand = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return <div className="flex justify-center items-center p-10"><SpinnerIcon className="h-12 w-12 text-blue-700" /></div>;
    }

    if (!hierarchy) {
        return <p className="text-center text-red-500">Impossible de construire la hiérarchie.</p>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <ul className="space-y-1">
                {Object.keys(hierarchy).map(regionName => (
                    <li key={regionName}>
                        <div onClick={() => toggleExpand(regionName)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <ChevronRightIcon className={`h-5 w-5 text-gray-500 transform transition-transform ${expanded[regionName] ? 'rotate-90' : ''}`} />
                            <FolderIcon className="h-6 w-6 text-yellow-500" />
                            <span className="font-bold text-gray-800">{regionName}</span>
                        </div>
                        {expanded[regionName] && (
                            <ul className="pl-6 border-l-2 border-gray-200 ml-5">
                                {Object.keys(hierarchy[regionName]).map(groupName => (
                                    <li key={groupName} className="mt-1">
                                        <div onClick={() => toggleExpand(`${regionName}-${groupName}`)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                            <ChevronRightIcon className={`h-5 w-5 text-gray-500 transform transition-transform ${expanded[`${regionName}-${groupName}`] ? 'rotate-90' : ''}`} />
                                            <FolderIcon className="h-5 w-5 text-blue-500" />
                                            <span className="font-semibold text-gray-700">{groupName}</span>
                                        </div>
                                        {expanded[`${regionName}-${groupName}`] && (
                                            <ul className="pl-6 border-l-2 border-gray-200 ml-4">
                                                {Object.keys(hierarchy[regionName][groupName]).map(districtName => (
                                                    <li key={districtName} className="mt-1">
                                                         <div onClick={() => toggleExpand(`${regionName}-${groupName}-${districtName}`)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                                            <ChevronRightIcon className={`h-5 w-5 text-gray-500 transform transition-transform ${expanded[`${regionName}-${groupName}-${districtName}`] ? 'rotate-90' : ''}`} />
                                                            <FolderIcon className="h-5 w-5 text-green-500" />
                                                            <span className="font-medium text-gray-600">{districtName}</span>
                                                        </div>
                                                        {expanded[`${regionName}-${groupName}-${districtName}`] && (
                                                             <ul className="pl-6 border-l-2 border-gray-200 ml-4">
                                                                {hierarchy[regionName][groupName][districtName].map(cell => (
                                                                    <li key={cell.id} className="mt-1 flex items-center space-x-2 p-2">
                                                                        <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                                                                        <span className="text-sm text-gray-600">{cell.cellName}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default HierarchyView;