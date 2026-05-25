export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Label {
  id: number;
  x: number;
  y: number;
  labelId: number; // 关联的 category id
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface LabelMeAnnotation {
  version: string;
  flags: Record<string, boolean>;
  shapes: Array<{
    label: string;
    points: number[][];
    group_id: null;
    shape_type: string;
    flags: Record<string, boolean>;
  }>;
  imagePath: string;
  imageHeight: number;
  imageWidth: number;
  categories?: Category[];
}
