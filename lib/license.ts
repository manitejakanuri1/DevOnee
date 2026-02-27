/**
 * License categorization and warning level utility for GitHub repositories.
 */

export type WarningLevel = 'info' | 'warning' | 'danger';

export interface LicenseInfo {
    key: string;
    name: string;
    spdxId: string | null;
    url: string | null;
    warningLevel: WarningLevel;
    description: string;
    obligations: string[];
    hasPatentClause: boolean;
    hasPatentsFile: boolean;
}

// License classification database
const LICENSE_DATA: Record<string, {
    level: WarningLevel;
    description: string;
    obligations: string[];
    hasPatentClause: boolean;
}> = {
    'mit': {
        level: 'info',
        description: 'Permissive license — you can freely use, modify, and distribute with minimal restrictions.',
        obligations: ['Include original copyright notice and license text'],
        hasPatentClause: false,
    },
    'apache-2.0': {
        level: 'info',
        description: 'Permissive license with an explicit patent grant — safe for most contributions.',
        obligations: ['Include copyright notice', 'State changes made', 'Include NOTICE file if present'],
        hasPatentClause: true,
    },
    'bsd-2-clause': {
        level: 'info',
        description: 'Permissive license — minimal restrictions on redistribution.',
        obligations: ['Include copyright notice in source and binary forms'],
        hasPatentClause: false,
    },
    'bsd-3-clause': {
        level: 'info',
        description: 'Permissive license — similar to BSD-2 with an additional non-endorsement clause.',
        obligations: ['Include copyright notice', 'No endorsement without permission'],
        hasPatentClause: false,
    },
    'isc': {
        level: 'info',
        description: 'Permissive license — functionally equivalent to MIT.',
        obligations: ['Include copyright notice'],
        hasPatentClause: false,
    },
    'unlicense': {
        level: 'info',
        description: 'Public domain dedication — no restrictions on use.',
        obligations: [],
        hasPatentClause: false,
    },
    'mpl-2.0': {
        level: 'warning',
        description: 'Weak copyleft — modified files must stay under MPL, but you can combine with proprietary code.',
        obligations: ['Modified files must remain under MPL-2.0', 'Source code of modified files must be available'],
        hasPatentClause: true,
    },
    'lgpl-2.1': {
        level: 'warning',
        description: 'Weak copyleft — modifications to the library must be shared, but linking is permitted.',
        obligations: ['Share modifications to the library itself', 'Include copyright notice'],
        hasPatentClause: false,
    },
    'lgpl-3.0': {
        level: 'warning',
        description: 'Weak copyleft — similar to LGPL-2.1 with additional patent provisions.',
        obligations: ['Share modifications to the library', 'Permit reverse engineering for debugging'],
        hasPatentClause: true,
    },
    'gpl-2.0': {
        level: 'warning',
        description: 'Strong copyleft — derivative works must also be licensed under GPL-2.0.',
        obligations: ['Entire derivative work must be GPL-2.0', 'Source code must be available', 'Include copyright notice'],
        hasPatentClause: false,
    },
    'gpl-3.0': {
        level: 'warning',
        description: 'Strong copyleft — derivative works must be GPL-3.0. Includes patent protection.',
        obligations: ['Entire derivative work must be GPL-3.0', 'Source code must be available', 'No tivoization', 'Patent grant included'],
        hasPatentClause: true,
    },
    'agpl-3.0': {
        level: 'warning',
        description: 'Network copyleft — even SaaS usage requires sharing source code. Strong obligations.',
        obligations: ['Source must be shared even for network use (SaaS)', 'Derivative works must be AGPL-3.0', 'Patent grant included'],
        hasPatentClause: true,
    },
    'bsl-1.0': {
        level: 'danger',
        description: 'Business Source License — may restrict production use until a change date.',
        obligations: ['May not use in production without a commercial license', 'Check change date and additional terms'],
        hasPatentClause: false,
    },
    'sspl-1.0': {
        level: 'danger',
        description: 'Server Side Public License — offering as a service requires sharing entire stack source.',
        obligations: ['Offering as a service requires sharing all service source code'],
        hasPatentClause: false,
    },
    'other': {
        level: 'danger',
        description: 'Non-standard or unrecognized license — review carefully before contributing.',
        obligations: ['Read the full license text', 'Consult legal advice if unsure'],
        hasPatentClause: false,
    },
};

/**
 * Categorize a license by its SPDX key and return warning info.
 */
export function categorizeLicense(
    licenseKey: string | null,
    licenseName: string | null,
    spdxId: string | null,
    url: string | null,
    hasPatentsFile: boolean = false
): LicenseInfo {
    // No license detected
    if (!licenseKey || licenseKey === 'none') {
        return {
            key: 'none',
            name: 'No License',
            spdxId: null,
            url: null,
            warningLevel: 'danger',
            description: 'This repository has no license. Under default copyright law, you have no permission to use, modify, or distribute this code.',
            obligations: ['Do not contribute without explicit permission from the owner', 'Contact the maintainer about adding a license'],
            hasPatentClause: false,
            hasPatentsFile,
        };
    }

    const key = licenseKey.toLowerCase();
    const data = LICENSE_DATA[key] || LICENSE_DATA['other'];

    return {
        key: licenseKey,
        name: licenseName || licenseKey.toUpperCase(),
        spdxId,
        url,
        warningLevel: data.level,
        description: data.description,
        obligations: data.obligations,
        hasPatentClause: data.hasPatentClause,
        hasPatentsFile,
    };
}
