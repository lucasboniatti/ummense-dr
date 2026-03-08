import * as dns from 'dns/promises';
import { URL } from 'url';

/**
 * SSRF (Server-Side Request Forgery) Validator Service
 * Prevents webhook URLs from targeting local/private IP ranges
 */
export class SSRFValidatorService {
  private readonly blocklist = [
    // IPv4 ranges
    '127.0.0.0/8',      // localhost
    '10.0.0.0/8',       // private
    '172.16.0.0/12',    // private
    '192.168.0.0/16',   // private
    '169.254.0.0/16',   // link-local
    '224.0.0.0/4',      // multicast
    '240.0.0.0/4',      // reserved
    '0.0.0.0/8',        // current network
    '255.255.255.255',  // broadcast

    // IPv6 ranges
    '::1',              // localhost
    'fc00::/7',         // private
    'fe80::/10',        // link-local
    'ff00::/8',         // multicast
    '::',               // unspecified
  ];

  private readonly allowedProtocols = ['http:', 'https:'];

  /**
   * Validate webhook URL for SSRF vulnerabilities
   * @param urlString URL to validate
   * @throws Error if URL is invalid or targets blocked IP range
   */
  async validateWebhookUrl(urlString: string): Promise<boolean> {
    try {
      // Parse URL
      const url = new URL(urlString);

      // Verify protocol
      if (!this.allowedProtocols.includes(url.protocol)) {
        throw new Error(`Invalid protocol: ${url.protocol}. Only http/https allowed.`);
      }

      // Extract hostname
      const hostname = this.normalizeHostname(url.hostname);

      // Check if it's an IP address directly
      if (this.isIpAddress(hostname)) {
        if (this.isBlockedIpAddress(hostname)) {
          throw new Error(`Blocked IP address: ${hostname} (SSRF protection)`);
        }
        return true;
      }

      // Resolve hostname to IP
      const ips = await this.resolveHostname(hostname);

      // Check each resolved IP
      for (const ip of ips) {
        if (this.isBlockedIpAddress(ip)) {
          throw new Error(
            `Hostname ${hostname} resolves to blocked IP address: ${ip} (SSRF protection)`
          );
        }
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`URL validation failed: ${message}`);
    }
  }

  /**
   * Check if IP address is in blocklist
   * @param ip IPv4 or IPv6 address
   * @returns true if blocked
   */
  private isBlockedIpAddress(ip: string): boolean {
    // Check exact matches first (::1, etc.)
    if (this.blocklist.includes(ip)) {
      return true;
    }

    // Check IPv4 CIDR ranges
    if (this.isIPv4Address(ip)) {
      return this.isIpInIpv4Range(ip);
    }

    // Check IPv6 CIDR ranges
    if (this.isIPv6Address(ip)) {
      return this.isIpInIpv6Range(ip);
    }

    return false;
  }

  /**
   * Check if IP falls within IPv4 CIDR range
   */
  private isIpInIpv4Range(ip: string): boolean {
    const ipv4Ranges = this.blocklist.filter(range => range.includes('.'));

    for (const range of ipv4Ranges) {
      if (range.includes('/')) {
        const [network, maskBits] = range.split('/');
        if (this.isIPv4InRange(ip, network, parseInt(maskBits))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if IP falls within IPv6 CIDR range
   */
  private isIpInIpv6Range(ip: string): boolean {
    const ipv6Ranges = this.blocklist.filter(range => range.includes(':'));

    for (const range of ipv6Ranges) {
      if (range === ip) {
        return true;
      }
      if (range.includes('/')) {
        const [network, maskBits] = range.split('/');
        if (this.isIPv6InRange(ip, network, parseInt(maskBits))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if IPv4 is in CIDR range
   */
  private isIPv4InRange(ip: string, network: string, maskBits: number): boolean {
    const ipParts = ip.split('.').map(Number);
    const netParts = network.split('.').map(Number);

    if (ipParts.length !== 4 || netParts.length !== 4) {
      return false;
    }

    // Convert to 32-bit integer
    const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const netInt = (netParts[0] << 24) + (netParts[1] << 16) + (netParts[2] << 8) + netParts[3];

    // Create mask
    const mask = (-1 << (32 - maskBits)) >>> 0; // Unsigned right shift to convert back to positive

    return (ipInt & mask) === (netInt & mask);
  }

  /**
   * Check if IPv6 is in CIDR range (simplified)
   */
  private isIPv6InRange(ip: string, network: string, maskBits: number): boolean {
    // Simplified IPv6 comparison - in production, use a proper IPv6 library
    // For now, accept if network is ::1 or fc00::
    if (network === '::1') {
      return ip === '::1';
    }
    if (network === 'fc00::') {
      return ip.startsWith('fc');
    }
    return false;
  }

  /**
   * Resolve hostname to IP addresses
   */
  private async resolveHostname(hostname: string): Promise<string[]> {
    try {
      const addresses = await dns.resolve4(hostname);
      return addresses;
    } catch {
      try {
        const addresses = await dns.resolve6(hostname);
        return addresses;
      } catch {
        throw new Error(`Failed to resolve hostname: ${hostname}`);
      }
    }
  }

  /**
   * Check if string is an IPv4 address
   */
  private isIPv4Address(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Check if string is an IPv6 address
   */
  private isIPv6Address(ip: string): boolean {
    // Simplified IPv6 check
    return ip.includes(':');
  }

  /**
   * Check if string is any valid IP address
   */
  private isIpAddress(ip: string): boolean {
    return this.isIPv4Address(ip) || this.isIPv6Address(ip);
  }

  /**
   * URLs with IPv6 literals expose the hostname wrapped in brackets.
   * Normalize to the raw IP form before matching against the blocklist.
   */
  private normalizeHostname(hostname: string): string {
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      return hostname.slice(1, -1);
    }

    return hostname;
  }
}

export const ssrfValidatorService = new SSRFValidatorService();
