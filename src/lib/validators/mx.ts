import type { MxCheck } from '@/types/email';

interface DnsApiResponse {
  Answer?: Array<{
    data: string;
    type: number;
  }>;
  Status: number;
}

export async function validateMx(domain: string): Promise<MxCheck> {
  try {
    // Use Google's DNS-over-HTTPS API to check MX records
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/dns-json',
        },
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        records: [],
        message: 'Failed to lookup MX records',
      };
    }

    const data: DnsApiResponse = await response.json();

    // Status 0 means NOERROR
    if (data.Status !== 0) {
      return {
        valid: false,
        records: [],
        message: 'No MX records found',
      };
    }

    // Check if we have MX records (type 15)
    const mxRecords = data.Answer?.filter((record) => record.type === 15) || [];

    if (mxRecords.length === 0) {
      // Try to check for A record as fallback (some domains accept mail without MX)
      const aResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/dns-json',
          },
        }
      );

      if (aResponse.ok) {
        const aData: DnsApiResponse = await aResponse.json();
        if (aData.Status === 0 && aData.Answer && aData.Answer.length > 0) {
          return {
            valid: true,
            records: ['[A record fallback]'],
            message: 'Domain has A record (MX fallback)',
          };
        }
      }

      return {
        valid: false,
        records: [],
        message: 'No MX records found for domain',
      };
    }

    // Extract MX hostnames
    const records = mxRecords.map((record) => {
      // MX data format: "priority hostname."
      const parts = record.data.split(' ');
      return parts.length > 1 ? parts[1].replace(/\.$/, '') : record.data;
    });

    return {
      valid: true,
      records,
      message: `Found ${records.length} MX record(s)`,
    };
  } catch {
    return {
      valid: false,
      records: [],
      message: 'Error checking MX records',
    };
  }
}
