import Swal from 'sweetalert2';

export const FittrackAlert = Swal.mixin({
  customClass: {
    confirmButton: 'btn btn-dark px-4 py-2 rounded-pill fw-bold mx-2',
    cancelButton: 'btn btn-outline-danger px-4 py-2 rounded-pill fw-bold mx-2'
  },
  buttonsStyling: false,
  confirmButtonColor: '#1b4d3e',
  cancelButtonColor: '#dc3545'
});
