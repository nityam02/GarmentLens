export type GarmentStatus = 'pending' | 'classified' | 'classification_failed' | 'completed'

export type GarmentType = 'shirt' | 'pants' | 'jacket' | 'dress' | 'skirt' | 'coat' | 'sweater' | 'suit' | 'shoes' | 'bag' | 'other'
export type Material = 'cotton' | 'wool' | 'silk' | 'polyester' | 'leather' | 'denim' | 'linen' | 'synthetic' | 'unknown'
export type DamageType = 'torn_seam' | 'hole' | 'stain' | 'broken_zipper' | 'missing_button' | 'worn_fabric' | 'hem_damage' | 'multiple' | 'none_visible'
export type Complexity = 'low' | 'medium' | 'high'

export interface Confidence {
  type: number
  material: number
  damage: number
  complexity: number
}

export interface Classification {
  type: GarmentType
  material: Material
  damage: DamageType
  complexity: Complexity
  notes: string | null
  confidence: Confidence | null
}

export interface Garment {
  id: string
  filename: string
  originalName: string
  status: GarmentStatus
  ai: Classification | null
  override: Omit<Classification, 'confidence'> | null
  createdAt: number
  classifiedAt: number | null
  completedAt: number | null
}

export const GARMENT_TYPES: GarmentType[] = ['shirt', 'pants', 'jacket', 'dress', 'skirt', 'coat', 'sweater', 'suit', 'shoes', 'bag', 'other']
export const MATERIALS: Material[] = ['cotton', 'wool', 'silk', 'polyester', 'leather', 'denim', 'linen', 'synthetic', 'unknown']
export const DAMAGE_TYPES: DamageType[] = ['torn_seam', 'hole', 'stain', 'broken_zipper', 'missing_button', 'worn_fabric', 'hem_damage', 'multiple', 'none_visible']
export const COMPLEXITIES: Complexity[] = ['low', 'medium', 'high']
