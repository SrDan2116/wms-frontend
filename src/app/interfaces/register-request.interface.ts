// Definimos los tipos permitidos para evitar errores de escritura
export type Genero = 'MASCULINO' | 'FEMENINO' | 'OTRO';
export type NivelActividad = 'SEDENTARIO' | 'LIGERO' | 'MODERADO' | 'ACTIVO' | 'MUY_ACTIVO';
export type Objetivo = 'PERDER_GRASA' | 'MANTENER' | 'GANAR_MASA' | 'RECOMPOSICION_CORPORAL';
export type Intensidad = 'LENTO' | 'NORMAL' | 'AGRESIVO';

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;

  // Datos Físicos
  fechaNacimiento?: string;
  genero?: Genero;
  alturaCm?: number;
  pesoInicial?: number;

  // Configuración
  nivelActividad?: NivelActividad;
  objetivo?: Objetivo;
  intensidadObjetivo?: Intensidad;
}
