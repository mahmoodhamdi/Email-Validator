import { parseSPF } from '@/lib/auth/spf';
import { parseDMARC } from '@/lib/auth/dmarc';
import { parseDKIM } from '@/lib/auth/dkim';

describe('Email Authentication', () => {
  describe('SPF Parser', () => {
    describe('valid SPF records', () => {
      test('parses valid SPF record with soft fail', () => {
        const record = 'v=spf1 include:_spf.google.com ~all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.version).toBe('v=spf1');
        expect(result.mechanisms).toHaveLength(2);
        expect(result.mechanisms[0].type).toBe('include');
        expect(result.mechanisms[0].value).toBe('_spf.google.com');
        expect(result.mechanisms[1].type).toBe('all');
        expect(result.mechanisms[1].qualifier).toBe('~');
      });

      test('parses SPF with hard fail (-all)', () => {
        const record = 'v=spf1 mx a -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms).toHaveLength(3);
        expect(result.mechanisms[0].type).toBe('mx');
        expect(result.mechanisms[1].type).toBe('a');
        expect(result.mechanisms[2].type).toBe('all');
        expect(result.mechanisms[2].qualifier).toBe('-');
      });

      test('parses SPF with ip4 mechanism', () => {
        const record = 'v=spf1 ip4:192.168.1.0/24 -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms[0].type).toBe('ip4');
        expect(result.mechanisms[0].value).toBe('192.168.1.0/24');
      });

      test('parses SPF with ip6 mechanism', () => {
        const record = 'v=spf1 ip6:2001:db8::/32 -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms[0].type).toBe('ip6');
        expect(result.mechanisms[0].value).toBe('2001:db8::/32');
      });

      test('parses SPF with redirect modifier', () => {
        const record = 'v=spf1 redirect=_spf.example.com';
        const result = parseSPF(record);

        expect(result.modifiers).toHaveLength(1);
        expect(result.modifiers[0].type).toBe('redirect');
        expect(result.modifiers[0].value).toBe('_spf.example.com');
      });

      test('parses SPF with exp modifier', () => {
        const record = 'v=spf1 mx -all exp=explain.example.com';
        const result = parseSPF(record);

        expect(result.modifiers).toHaveLength(1);
        expect(result.modifiers[0].type).toBe('exp');
        expect(result.modifiers[0].value).toBe('explain.example.com');
      });

      test('parses SPF with multiple includes', () => {
        const record = 'v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms).toHaveLength(3);
        expect(result.mechanisms[0].type).toBe('include');
        expect(result.mechanisms[1].type).toBe('include');
        expect(result.mechanisms[2].type).toBe('all');
      });

      test('parses SPF with neutral qualifier (?all)', () => {
        const record = 'v=spf1 mx ?all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms[1].qualifier).toBe('?');
      });

      test('parses SPF with pass qualifier (+all)', () => {
        const record = 'v=spf1 mx +all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms[1].qualifier).toBe('+');
      });

      test('parses SPF with ptr mechanism', () => {
        const record = 'v=spf1 ptr:example.com -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms[0].type).toBe('ptr');
        expect(result.mechanisms[0].value).toBe('example.com');
      });

      test('parses SPF with exists mechanism', () => {
        const record = 'v=spf1 exists:%{ir}.sbl.example.com -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(true);
        expect(result.mechanisms[0].type).toBe('exists');
      });
    });

    describe('invalid SPF records', () => {
      test('detects invalid SPF version', () => {
        const record = 'v=spf2 include:example.com -all';
        const result = parseSPF(record);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid SPF version');
      });

      test('detects unknown mechanism', () => {
        const record = 'v=spf1 unknown:value -all';
        const result = parseSPF(record);

        expect(result.errors).toContain('Unknown mechanism: unknown');
      });
    });

    describe('default qualifiers', () => {
      test('uses + as default qualifier when not specified', () => {
        const record = 'v=spf1 mx all';
        const result = parseSPF(record);

        expect(result.mechanisms[0].qualifier).toBe('+');
        expect(result.mechanisms[1].qualifier).toBe('+');
      });
    });
  });

  describe('DMARC Parser', () => {
    describe('valid DMARC records', () => {
      test('parses valid DMARC record with reject policy', () => {
        const record = 'v=DMARC1; p=reject; rua=mailto:dmarc@example.com';
        const result = parseDMARC(record);

        expect(result.valid).toBe(true);
        expect(result.version).toBe('DMARC1');
        expect(result.policy).toBe('reject');
        expect(result.rua).toContain('mailto:dmarc@example.com');
      });

      test('parses DMARC with quarantine policy', () => {
        const record = 'v=DMARC1; p=quarantine; pct=50';
        const result = parseDMARC(record);

        expect(result.valid).toBe(true);
        expect(result.policy).toBe('quarantine');
        expect(result.percentage).toBe(50);
      });

      test('parses DMARC with none policy', () => {
        const record = 'v=DMARC1; p=none';
        const result = parseDMARC(record);

        expect(result.valid).toBe(true);
        expect(result.policy).toBe('none');
      });

      test('parses DMARC with subdomain policy', () => {
        const record = 'v=DMARC1; p=quarantine; sp=reject; pct=50';
        const result = parseDMARC(record);

        expect(result.policy).toBe('quarantine');
        expect(result.subdomainPolicy).toBe('reject');
        expect(result.percentage).toBe(50);
      });

      test('parses DMARC with alignment modes', () => {
        const record = 'v=DMARC1; p=none; adkim=s; aspf=r';
        const result = parseDMARC(record);

        expect(result.adkim).toBe('s');
        expect(result.aspf).toBe('r');
      });

      test('parses DMARC with multiple report URIs', () => {
        const record = 'v=DMARC1; p=reject; rua=mailto:a@example.com,mailto:b@example.com';
        const result = parseDMARC(record);

        expect(result.rua).toHaveLength(2);
        expect(result.rua).toContain('mailto:a@example.com');
        expect(result.rua).toContain('mailto:b@example.com');
      });

      test('parses DMARC with forensic report URI', () => {
        const record = 'v=DMARC1; p=reject; ruf=mailto:forensic@example.com';
        const result = parseDMARC(record);

        expect(result.ruf).toContain('mailto:forensic@example.com');
      });

      test('parses DMARC with 100% percentage', () => {
        const record = 'v=DMARC1; p=reject; pct=100';
        const result = parseDMARC(record);

        expect(result.percentage).toBe(100);
      });

      test('parses DMARC with strict DKIM alignment', () => {
        const record = 'v=DMARC1; p=reject; adkim=s';
        const result = parseDMARC(record);

        expect(result.adkim).toBe('s');
      });

      test('parses DMARC with relaxed SPF alignment', () => {
        const record = 'v=DMARC1; p=reject; aspf=r';
        const result = parseDMARC(record);

        expect(result.aspf).toBe('r');
      });
    });

    describe('invalid DMARC records', () => {
      test('detects invalid DMARC version', () => {
        const record = 'v=DMARC2; p=reject';
        const result = parseDMARC(record);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid DMARC version');
      });

      test('detects invalid policy', () => {
        const record = 'v=DMARC1; p=invalid';
        const result = parseDMARC(record);

        expect(result.errors).toContain('Invalid policy: invalid');
      });
    });

    describe('edge cases', () => {
      test('handles extra whitespace', () => {
        const record = 'v=DMARC1;  p=reject;  rua=mailto:dmarc@example.com';
        const result = parseDMARC(record);

        expect(result.valid).toBe(true);
        expect(result.policy).toBe('reject');
      });

      test('handles missing trailing semicolon', () => {
        const record = 'v=DMARC1; p=reject';
        const result = parseDMARC(record);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('DKIM Parser', () => {
    describe('valid DKIM records', () => {
      test('parses valid DKIM record', () => {
        const record = 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...';
        const result = parseDKIM('selector1', record);

        expect(result.valid).toBe(true);
        expect(result.selector).toBe('selector1');
        expect(result.version).toBe('DKIM1');
        expect(result.keyType).toBe('rsa');
        expect(result.publicKey).toBeTruthy();
      });

      test('parses DKIM without version', () => {
        const record = 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...';
        const result = parseDKIM('default', record);

        expect(result.valid).toBe(true);
        expect(result.keyType).toBe('rsa');
        expect(result.publicKey).toBeTruthy();
      });

      test('parses DKIM with ed25519 key type', () => {
        const record = 'v=DKIM1; k=ed25519; p=abc123...';
        const result = parseDKIM('selector', record);

        expect(result.keyType).toBe('ed25519');
      });
    });

    describe('revoked DKIM records', () => {
      test('detects revoked DKIM record (empty public key)', () => {
        const record = 'v=DKIM1; p=';
        const result = parseDKIM('default', record);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Empty public key (revoked)');
      });
    });

    describe('edge cases', () => {
      test('handles record with extra semicolons', () => {
        const record = 'v=DKIM1; k=rsa; p=abc123;;';
        const result = parseDKIM('selector', record);

        expect(result.publicKey).toBe('abc123');
      });

      test('handles record with spaces around values', () => {
        const record = 'v=DKIM1; k = rsa; p = abc123';
        const result = parseDKIM('selector', record);

        // Values get trimmed
        expect(result).toHaveProperty('publicKey');
      });
    });
  });
});
