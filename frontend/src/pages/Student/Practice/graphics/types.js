// Vector3 type: [number, number, number]

export const TransformationType = {
  INITIAL: 'Vật thể gốc',
  TRANSLATION: 'Tịnh tiến',
  ROTATION: 'Quay',
  SCALING: 'Tỉ lệ',
};

// TransformParams interface
// { tx, ty, tz, rx, ry, rz, sx, sy, sz }

// ObjectState interface
// {
//   id: string,
//   type: TransformationType,
//   position: Vector3,
//   rotation: Vector3,
//   scale: Vector3,
//   color: string,
//   label: string,
//   timestamp: number,
//   appliedTransformParams?: TransformParams
// }

