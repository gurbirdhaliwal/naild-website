export const AUREON_NAME = 'Aureon'
export const AUREON_VERSION_LABEL = 'Aureon 1.0'

export const AUREON_MODEL_OPTIONS = [
  {
    id: 'aureon-1.0',
    label: AUREON_VERSION_LABEL,
    description: 'Current default model',
    available: true,
  },
  {
    id: 'legacy-models',
    label: 'Legacy models',
    description: 'Coming soon',
    available: false,
  },
  {
    id: 'other-models',
    label: 'Other models',
    description: 'Coming soon',
    available: false,
  },
] as const
