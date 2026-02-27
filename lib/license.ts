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
    plainLanguage: string;
    permissions: string[];
    limitations: string[];
    obligations: string[];
    hasPatentClause: boolean;
    hasPatentsFile: boolean;
    patentsFileContent?: string;
}

// License classification database
const LICENSE_DATA: Record<string, {
    level: WarningLevel;
    description: string;
    plainLanguage: string;
    permissions: string[];
    limitations: string[];
    obligations: string[];
    hasPatentClause: boolean;
}> = {
    'mit': {
        level: 'info',
        description: 'Permissive license — you can freely use, modify, and distribute with minimal restrictions.',
        plainLanguage: 'You can do almost anything with this code as long as you include the original license.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty'],
        obligations: ['Include original copyright notice and license text'],
        hasPatentClause: false,
    },
    'apache-2.0': {
        level: 'info',
        description: 'Permissive license with an explicit patent grant — safe for most contributions.',
        plainLanguage: 'You can use this code freely. Contributors grant you a patent license, protecting you from patent claims.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        limitations: ['No liability', 'No warranty', 'No trademark rights'],
        obligations: ['Include copyright notice', 'State changes made', 'Include NOTICE file if present'],
        hasPatentClause: true,
    },
    'bsd-2-clause': {
        level: 'info',
        description: 'Permissive license — minimal restrictions on redistribution.',
        plainLanguage: 'Very permissive. Just keep the copyright notice when you redistribute.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty'],
        obligations: ['Include copyright notice in source and binary forms'],
        hasPatentClause: false,
    },
    'bsd-3-clause': {
        level: 'info',
        description: 'Permissive license — similar to BSD-2 with an additional non-endorsement clause.',
        plainLanguage: 'Very permissive. Keep the copyright notice and don\'t use the author\'s name to promote your work.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty', 'No endorsement without permission'],
        obligations: ['Include copyright notice', 'No endorsement without permission'],
        hasPatentClause: false,
    },
    'isc': {
        level: 'info',
        description: 'Permissive license — functionally equivalent to MIT.',
        plainLanguage: 'Functionally identical to MIT. Do anything, just include the license.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty'],
        obligations: ['Include copyright notice'],
        hasPatentClause: false,
    },
    'unlicense': {
        level: 'info',
        description: 'Public domain dedication — no restrictions on use.',
        plainLanguage: 'This code is in the public domain. No restrictions at all.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty'],
        obligations: [],
        hasPatentClause: false,
    },
    'mpl-2.0': {
        level: 'warning',
        description: 'Weak copyleft — modified files must stay under MPL, but you can combine with proprietary code.',
        plainLanguage: 'You can use this in proprietary software, but any changes to MPL-covered files must be shared.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        limitations: ['No liability', 'No warranty', 'No trademark rights'],
        obligations: ['Modified files must remain under MPL-2.0', 'Source code of modified files must be available'],
        hasPatentClause: true,
    },
    'lgpl-2.1': {
        level: 'warning',
        description: 'Weak copyleft — modifications to the library must be shared, but linking is permitted.',
        plainLanguage: 'You can link to this library from proprietary code, but changes to the library itself must be shared.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty'],
        obligations: ['Share modifications to the library itself', 'Include copyright notice', 'Allow reverse engineering for debugging'],
        hasPatentClause: false,
    },
    'lgpl-3.0': {
        level: 'warning',
        description: 'Weak copyleft — similar to LGPL-2.1 with additional patent provisions.',
        plainLanguage: 'Like LGPL-2.1 but with patent protection. You can link from proprietary code, but library changes must be shared.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        limitations: ['No liability', 'No warranty'],
        obligations: ['Share modifications to the library', 'Permit reverse engineering for debugging'],
        hasPatentClause: true,
    },
    'gpl-2.0': {
        level: 'warning',
        description: 'Strong copyleft — derivative works must also be licensed under GPL-2.0.',
        plainLanguage: 'Any software that includes this code must also be open-source under GPL-2.0. Cannot be used in closed-source projects.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Private use'],
        limitations: ['No liability', 'No warranty', 'Entire derivative work must be GPL-2.0'],
        obligations: ['Entire derivative work must be GPL-2.0', 'Source code must be available', 'Include copyright notice'],
        hasPatentClause: false,
    },
    'gpl-3.0': {
        level: 'warning',
        description: 'Strong copyleft — derivative works must be GPL-3.0. Includes patent protection.',
        plainLanguage: 'Like GPL-2.0 but with patent grants. Any derivative work must also be GPL-3.0 and open-source.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        limitations: ['No liability', 'No warranty', 'Entire derivative work must be GPL-3.0'],
        obligations: ['Entire derivative work must be GPL-3.0', 'Source code must be available', 'No tivoization', 'Patent grant included'],
        hasPatentClause: true,
    },
    'agpl-3.0': {
        level: 'warning',
        description: 'Network copyleft — even SaaS usage requires sharing source code. Strong obligations.',
        plainLanguage: 'Strongest copyleft. Even running this as a web service (SaaS) requires you to share your entire source code.',
        permissions: ['Commercial use', 'Modification', 'Distribution', 'Patent use', 'Private use'],
        limitations: ['No liability', 'No warranty', 'Network use is distribution', 'Entire work must be AGPL-3.0'],
        obligations: ['Source must be shared even for network use (SaaS)', 'Derivative works must be AGPL-3.0', 'Patent grant included'],
        hasPatentClause: true,
    },
    'bsl-1.0': {
        level: 'danger',
        description: 'Business Source License — may restrict production use until a change date.',
        plainLanguage: 'You cannot use this in production without a commercial license. It becomes open-source after a "change date".',
        permissions: ['Non-production use', 'Viewing source code', 'Modification for non-production'],
        limitations: ['No production use without commercial license', 'No redistribution as a competing service'],
        obligations: ['May not use in production without a commercial license', 'Check change date and additional terms'],
        hasPatentClause: false,
    },
    'sspl-1.0': {
        level: 'danger',
        description: 'Server Side Public License — offering as a service requires sharing entire stack source.',
        plainLanguage: 'If you offer this as a service, you must open-source your entire technology stack. Extremely restrictive for SaaS.',
        permissions: ['Modification', 'Distribution', 'Private use'],
        limitations: ['SaaS use requires full stack disclosure', 'Not OSI-approved'],
        obligations: ['Offering as a service requires sharing all service source code'],
        hasPatentClause: false,
    },
    'other': {
        level: 'danger',
        description: 'Non-standard or unrecognized license — review carefully before contributing.',
        plainLanguage: 'This uses a custom or unrecognized license. Read it carefully before using this code.',
        permissions: ['Unknown — review license text'],
        limitations: ['Unknown — review license text'],
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
    hasPatentsFile: boolean = false,
    patentsFileContent?: string
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
            plainLanguage: 'No license means all rights reserved. You cannot legally use, modify, or share this code.',
            permissions: [],
            limitations: ['No use allowed', 'No modification allowed', 'No distribution allowed'],
            obligations: ['Do not contribute without explicit permission from the owner', 'Contact the maintainer about adding a license'],
            hasPatentClause: false,
            hasPatentsFile,
            patentsFileContent,
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
        plainLanguage: data.plainLanguage,
        permissions: data.permissions,
        limitations: data.limitations,
        obligations: data.obligations,
        hasPatentClause: data.hasPatentClause,
        hasPatentsFile,
        patentsFileContent,
    };
}
