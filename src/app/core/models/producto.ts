export interface Producto {
  id?: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precioUnitario: number;
  pesoKg: number;
  categoriaId: number;
  creadoEn?: string;
}
