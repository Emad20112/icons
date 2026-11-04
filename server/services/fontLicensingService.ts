export type LicenseCategory = 'PERMISSIVE' | 'RESTRICTED' | 'UNKNOWN'

export interface LicenseValidationResult {
  category: LicenseCategory
  isDistributable: boolean
  isWebEmbeddable: boolean
  isCommercialAllowed: boolean
  attributionRequired: boolean
  warning?: string
}

export class FontLicensingService {
  /**
   * Analyzes a raw license string and returns its safety profile
   */
  public static inspectLicense(licenseType: string): LicenseValidationResult {
    const raw = (licenseType || '').trim().toUpperCase()

    if (raw === 'OFL' || raw.includes('OPEN FONT') || raw.includes('SIL')) {
      return {
        category: 'PERMISSIVE',
        isDistributable: true,
        isWebEmbeddable: true,
        isCommercialAllowed: true,
        attributionRequired: true,
      }
    }

    if (raw === 'APACHE' || raw.includes('APACHE-2.0')) {
      return {
        category: 'PERMISSIVE',
        isDistributable: true,
        isWebEmbeddable: true,
        isCommercialAllowed: true,
        attributionRequired: true,
      }
    }

    if (raw === 'MIT') {
      return {
        category: 'PERMISSIVE',
        isDistributable: true,
        isWebEmbeddable: true,
        isCommercialAllowed: true,
        attributionRequired: true,
      }
    }

    if (raw === 'CC0' || raw.includes('PUBLIC DOMAIN')) {
      return {
        category: 'PERMISSIVE',
        isDistributable: true,
        isWebEmbeddable: true,
        isCommercialAllowed: true,
        attributionRequired: false,
      }
    }

    if (raw.includes('COMMERCIAL') || raw.includes('PROPRIETARY') || raw.includes('PAID')) {
      return {
        category: 'RESTRICTED',
        isDistributable: false,
        isWebEmbeddable: false,
        isCommercialAllowed: false,
        attributionRequired: true,
        warning: 'This font requires an active commercial license purchase before redistribution.',
      }
    }

    // Default unknown
    return {
      category: 'UNKNOWN',
      isDistributable: false,
      isWebEmbeddable: false,
      isCommercialAllowed: false,
      attributionRequired: true,
      warning: 'License type is unknown or unverified. Requires manual admin clearance prior to public distribution.',
    }
  }

  /**
   * Publication Guard: Ensures fonts without a verified permissive license cannot be published without manual admin override
   */
  public static validatePublicationEligibility(
    licenseType: string,
    isManualAdminClearance: boolean = false
  ): { allowed: boolean; reason?: string } {
    const validation = this.inspectLicense(licenseType)

    if (validation.isDistributable) {
      return { allowed: true }
    }

    if (isManualAdminClearance) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Cannot publish font family: ${validation.warning || 'Restricted license terms prevent public distribution.'}`,
    }
  }
}
