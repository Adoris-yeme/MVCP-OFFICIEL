import React, { useMemo, useState } from 'react';

interface BeninMapProps {
    cellData: { [key: string]: number };
}

// Map from custom regions in the app to official department names
const regionToDepartmentMap: { [key: string]: string } = {
    "Littoral": "Littoral",
    "Oueme nord": "Ouémé",
    "Oueme sud": "Ouémé",
    "Plateau": "Plateau",
    "Atlantique nord": "Atlantique",
    "Atlantique sud": "Atlantique",
    "Mono": "Mono",
    "Mono sud": "Mono",
    "Mono nord": "Mono",
    "Couffo": "Couffo",
    "Zou": "Zou",
    "Colline sud": "Collines",
    "Colline nord": "Collines",
    "Borgou": "Borgou",
    "Atacora": "Atakora",
    "Donga": "Donga",
    "Alibori": "Alibori",
};

// SVG path data for Benin departments
const beninDepartments: { [name: string]: { path: string } } = {
    Alibori: { path: "M 419.5,4.3 C 418.9,13.7 417.8,25.3 417.1,37.1 C 414.4,80.1 411.8,123.2 409,166.4 C 408.8,169.5 408.4,172.6 408,175.7 C 395.2,185.2 393.3,184.4 391.2,186.2 C 383,192.5 374.8,198.8 366.6,205.1 C 365,206.5 363.3,207.9 361.7,209.3 C 390.6,155.6 420.2,101.3 449.2,47.8 C 449.6,47.2 450,46.5 450.3,45.9 C 452.5,41.9 454.7,37.9 456.9,33.9 C 458.1,31.7 459.1,29.3 460,27 C 453.7,22.8 447.1,18.8 440.6,14.8 C 436.4,12.2 432.2,9.6 428,7.1 C 425.2,5.5 422.3,4.4 419.5,4.3 Z" },
    Atakora: { path: "M 320.1,6.1 C 319.4,16.2 318.5,26.4 317.5,36.5 C 310.8,99.9 304.1,163.3 297.4,226.7 C 296.8,231.8 296.2,236.9 295.6,242 C 304.1,232.1 309.2,225.7 313.7,220 C 326.3,203.9 339.1,187.9 351.7,171.8 C 354.3,168.3 356.9,164.8 359.5,161.3 C 347.1,110.1 334.2,58.5 321.3,6.9 C 320.9,6.6 320.5,6.3 320.1,6.1 Z" },
    Donga: { path: "M 361.7,209.3 C 350.3,222.8 338.9,236.3 327.5,249.8 C 324,254.1 320.5,258.4 317,262.7 C 310.3,272.7 303.6,282.7 296.9,292.7 C 296.2,293.7 295.6,294.6 294.9,295.6 C 317.2,277.6 331.3,266.3 344.6,253.3 C 354.4,243.6 364.1,233.9 373.9,224.2 C 375.4,222.7 376.9,221.2 378.4,219.7 C 372.8,216.2 367.3,212.8 361.7,209.3 Z" },
    Borgou: { path: "M 380,219.7 C 378.4,222.7 377.3,224.8 376,227.1 C 369.2,238.1 362.5,249.2 355.7,260.2 C 348.6,271.6 341.5,283 334.4,294.4 C 333.6,295.6 332.9,296.9 332.1,298.1 C 359.4,272.5 380.2,254.1 400.9,235.3 C 411.3,225.8 421.7,216.3 432.1,206.8 C 432.8,206.2 433.5,205.6 434.2,205 C 416.1,209.9 397.9,214.8 380,219.7 Z" },
    Collines: { path: "M 332.1,298.1 C 320.8,316.4 309.5,334.7 298.2,353 C 285.3,373.9 272.4,394.8 259.5,415.7 C 257.6,418.8 255.7,421.9 253.8,425 C 283.4,399.5 305.7,379.8 327.1,359.3 C 341.5,345.1 355.9,330.9 370.3,316.7 C 372.4,314.7 374.5,312.7 376.6,310.7 C 361.7,306.5 346.9,302.3 332.1,298.1 Z" },
    Zou: { path: "M 253.8,425 C 242.2,442.8 230.6,460.6 219,478.4 C 206.8,497.1 194.7,515.8 182.5,534.5 C 181.2,536.6 179.9,538.7 178.6,540.8 C 203.7,502.2 228.8,463.6 253.8,425 Z" },
    Couffo: { path: "M 178.6,540.8 C 166.5,558.2 154.4,575.6 142.3,593 C 132.8,606.8 123.3,620.6 113.8,634.4 C 112.5,636.2 111.1,638.1 109.8,640 C 132.7,606.9 155.6,573.8 178.6,540.8 Z" },
    Mono: { path: "M 109.8,640 C 97.4,657.9 85,675.8 72.6,693.7 C 65.7,703.3 58.8,712.9 51.9,722.5 C 50.4,724.6 48.9,726.7 47.4,728.8 C 68.2,699.2 89,669.6 109.8,640 Z" },
    Atlantique: { path: "M 206,534.5 C 196.4,551.4 186.8,568.3 177.2,585.2 C 162.7,611.3 148.2,637.4 133.7,663.5 C 131.6,667.3 129.5,671.1 127.4,674.9 C 153.2,628.1 179.1,581.3 206,534.5 Z" },
    Littoral: { path: "M 127.4,674.9 C 117.2,692.6 107,710.3 96.8,728 C 94.6,731.7 92.4,735.4 90.2,739.1 C 102.6,717.7 115,696.3 127.4,674.9 Z" },
    Ouémé: { path: "M 326.3,534.5 C 314.9,555.2 303.6,575.9 292.2,596.6 C 277.8,622.9 263.4,649.2 249,675.5 C 247.1,679 245.2,682.5 243.3,686 C 270.9,635.7 298.6,585.4 326.3,534.5 Z" },
    Plateau: { path: "M 370.3,425 C 360,444.6 349.7,464.2 339.4,483.8 C 328.7,504.1 318,524.4 307.3,544.7 C 305.8,547.4 304.3,550.1 302.8,552.8 C 325.3,510.9 347.8,469 370.3,425 Z" }
};


const Tooltip: React.FC<{ content: string; x: number; y: number }> = ({ content, x, y }) => {
    // Offset the tooltip to appear near the cursor but not directly under it
    const tooltipStyle: React.CSSProperties = {
        position: 'fixed', // Use fixed positioning to escape SVG bounds
        left: `${x + 15}px`,
        top: `${y + 15}px`,
        transform: 'translate(-50%, -100%)', // Adjust to position it above the cursor
        pointerEvents: 'none',
        zIndex: 1000,
    };

    return (
        <div
            className="bg-gray-800 text-white text-xs rounded-md px-3 py-1 shadow-lg"
            style={tooltipStyle}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};


const BeninMap: React.FC<BeninMapProps> = ({ cellData }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    
    // 1. Aggregate cell data from custom regions to official departments
    const departmentData = useMemo(() => {
        const aggregatedData: { [key: string]: number } = {};
        for (const region in cellData) {
            const department = regionToDepartmentMap[region];
            if (department) {
                aggregatedData[department] = (aggregatedData[department] || 0) + cellData[region];
            }
        }
        return aggregatedData;
    }, [cellData]);

    // 2. Determine the color scale
    const maxCells = useMemo(() => {
        const values = Object.values(departmentData);
        // FIX: Cast `values` to number[] to resolve 'Argument of type 'unknown' is not assignable to parameter of type 'number'' error.
        return values.length > 0 ? Math.max(...(values as number[]), 1) : 1; // Avoid division by zero
    }, [departmentData]);

    const getColor = (departmentName: string) => {
        const count = departmentData[departmentName] || 0;
        if (count === 0) return '#e5e7eb'; // Tailwind gray-200 for no cells
        
        // Simple linear interpolation for color intensity (blue scale)
        const intensity = count / maxCells;
        const lightness = 90 - (intensity * 60); // from 90% (light) to 30% (dark)
        return `hsl(210, 80%, ${lightness}%)`;
    };

    // 3. Handle mouse events for tooltip
    const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, departmentName: string) => {
        const count = departmentData[departmentName] || 0;
        const content = `<strong>${departmentName}</strong><br/>${count} cellule${count > 1 ? 's' : ''}`;
        setTooltip({ content, x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    return (
        <div className="w-full h-full relative">
            <svg
                viewBox="0 0 500 800"
                className="w-full h-auto"
                aria-label="Carte du Bénin avec la répartition des cellules"
            >
                <g>
                    {Object.entries(beninDepartments).map(([name, { path }]) => (
                        <path
                            key={name}
                            d={path}
                            fill={getColor(name)}
                            stroke="#ffffff"
                            strokeWidth="2"
                            onMouseMove={(e) => handleMouseMove(e, name)}
                            onMouseLeave={handleMouseLeave}
                            className="transition-opacity duration-200 hover:opacity-80 cursor-pointer"
                        />
                    ))}
                </g>
            </svg>
            {tooltip && <Tooltip content={tooltip.content} x={tooltip.x} y={tooltip.y} />}
        </div>
    );
};

export default BeninMap;