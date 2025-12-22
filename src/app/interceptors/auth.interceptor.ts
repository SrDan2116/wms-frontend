import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Obtener el token guardado
  const token = sessionStorage.getItem('token');

  // 2. Si existe, clonamos la petición y le inyectamos el header
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  // 3. Si no hay token, pasa la petición tal cual
  return next(req);
};
