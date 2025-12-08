export const commonTypos: Record<string, string> = {
  // Gmail typos
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cim': 'gmail.com',
  'gmail.vom': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmailcom': 'gmail.com',
  'g-mail.com': 'gmail.com',
  'gamail.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'ggmail.com': 'gmail.com',
  'gimail.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmaikl.com': 'gmail.com',
  'gmailc.om': 'gmail.com',
  'gmaile.com': 'gmail.com',
  'gmailo.com': 'gmail.com',
  'gmayl.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmial.co': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gmailk.com': 'gmail.com',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahoo.om': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com',
  'yao.com': 'yahoo.com',
  'yahhoo.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'yahooo.co': 'yahoo.com',
  'yahou.com': 'yahoo.com',
  'ymail.co': 'ymail.com',
  'ymail.cm': 'ymail.com',

  // Hotmail typos
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmail.om': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmall.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmaik.com': 'hotmail.com',
  'hotmaol.com': 'hotmail.com',
  'hotmsil.com': 'hotmail.com',
  'hormail.com': 'hotmail.com',
  'htomail.com': 'hotmail.com',

  // Outlook typos
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlook.om': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlool.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'outlokk.com': 'outlook.com',
  'outook.com': 'outlook.com',
  'oulook.com': 'outlook.com',
  'otlook.com': 'outlook.com',
  'ourlook.com': 'outlook.com',
  'outlouk.com': 'outlook.com',

  // iCloud typos
  'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'icloud.cm': 'icloud.com',
  'icloud.om': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icould.com': 'icloud.com',
  'icluod.com': 'icloud.com',
  'iclould.com': 'icloud.com',
  'icolud.com': 'icloud.com',

  // Live typos
  'live.co': 'live.com',
  'live.cm': 'live.com',
  'live.om': 'live.com',
  'live.con': 'live.com',
  'liv.com': 'live.com',
  'livee.com': 'live.com',

  // AOL typos
  'aol.co': 'aol.com',
  'aol.cm': 'aol.com',
  'aol.om': 'aol.com',
  'aol.con': 'aol.com',
  'aoll.com': 'aol.com',
  'ao.com': 'aol.com',

  // ProtonMail typos
  'protonmail.co': 'protonmail.com',
  'protonmail.cm': 'protonmail.com',
  'protonmai.com': 'protonmail.com',
  'protonmal.com': 'protonmail.com',
  'protonmial.com': 'protonmail.com',
  'protonmaill.com': 'protonmail.com',
  'protomail.com': 'protonmail.com',

  // Common TLD typos
  '.comm': '.com',
  '.coom': '.com',
  '.comn': '.com',
  '.cmo': '.com',
  '.ocm': '.com',
  '.cpm': '.com',
  '.xom': '.com',
  '.vom': '.com',
  '.conm': '.com',
  '.nett': '.net',
  '.nte': '.net',
  '.orgg': '.org',
  '.ogr': '.org',
};

export function getSuggestion(domain: string): string | null {
  const lowerDomain = domain.toLowerCase();

  // Direct match
  if (commonTypos[lowerDomain]) {
    return commonTypos[lowerDomain];
  }

  // Check TLD typos
  for (const [typo, correct] of Object.entries(commonTypos)) {
    if (typo.startsWith('.') && lowerDomain.endsWith(typo.slice(1))) {
      return lowerDomain.slice(0, -typo.length + 1) + correct.slice(1);
    }
  }

  // Levenshtein distance check for common domains
  const commonDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'protonmail.com',
    'live.com',
    'ymail.com',
  ];

  for (const correctDomain of commonDomains) {
    const distance = levenshteinDistance(lowerDomain, correctDomain);
    if (distance > 0 && distance <= 2) {
      return correctDomain;
    }
  }

  return null;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}
