import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Librería de Gráficos
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexTooltip, ApexStroke, ApexFill, ApexYAxis, ApexGrid } from "ng-apexcharts";
import { WeightService, Peso } from '../../services/weight/weight.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  fill: ApexFill;
  yaxis: ApexYAxis;
  grid: ApexGrid;
  colors: string[];
};

@Component({
  selector: 'app-weight-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgApexchartsModule],
  templateUrl: './weight-tracker.html',
  styleUrl: './weight-tracker.scss'
})
export class WeightTrackerComponent implements OnInit {
  @ViewChild("chart") chart!: ChartComponent;

  private weightService = inject(WeightService);
  private fb = inject(FormBuilder);

  public chartOptions!: Partial<ChartOptions>;
  public isLoading = true;
  public historial: Peso[] = [];

  // Datos resumen (KPIs)
  public pesoActual = 0;
  public pesoInicial = 0;
  public progresoTotal = 0;

  form: FormGroup = this.fb.group({
    valor: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
    fecha: [new Date().toISOString().split('T')[0], Validators.required]
  });

  ngOnInit() {
    this.initChartConfig();
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.weightService.getHistory().subscribe({
      next: (data) => {
        this.historial = data;
        // Ordenamos por fecha ascendente para el gráfico
        this.historial.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        this.actualizarUI();
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  actualizarUI() {
    if (this.historial.length > 0) {
      // 1. Recalcular KPIs (Texto)
      // Asumiendo que el array está ordenado cronológicamente (antiguo -> nuevo)
      this.pesoActual = this.historial[this.historial.length - 1].valor;
      this.pesoInicial = this.historial[0].valor;
      this.progresoTotal = this.pesoActual - this.pesoInicial;

      // 2. Redibujar Gráfico
      this.updateChart(this.historial);
    }
  }

  saveWeight() {
    if (this.form.invalid) return;

    const { valor, fecha } = this.form.value;

    // Crear objeto temporal
    const nuevoPeso: Peso = { valor: valor, fecha: fecha, id: Date.now() };

    this.weightService.addEntry(valor, fecha).subscribe({
      next: (savedData) => {
        // --- OPTIMIZACIÓN VISUAL ---
        nuevoPeso.id = savedData.id; // Actualizar ID real
        this.historial.push(nuevoPeso);
        this.historial.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        this.actualizarUI();

        this.form.patchValue({
            valor: '',
            fecha: new Date().toISOString().split('T')[0]
        });
      }
    });
  }

  updateChart(data: Peso[]) {
    const valores = data.map(d => d.valor);
    const fechas = data.map(d => d.fecha);

    // Actualizar solo series y xaxis
    if (this.chart) {
        this.chart.updateOptions({
            series: [{ data: valores }],
            xaxis: { categories: fechas }
        });
    }
  }

  // --- CONFIGURACIÓN VISUAL DEL GRÁFICO (VERDE) ---
  initChartConfig() {
    this.chartOptions = {
      series: [{ name: "Peso", data: [] }],
      chart: {
        type: "area",
        height: 300,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif',
        animations: { enabled: true }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: 3
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4, // Más sutil
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      // AQUÍ ESTÁ EL CAMBIO CLAVE: Usamos el Verde Bosque
      colors: ["#1b4d3e"],

      xaxis: {
        type: 'datetime',
        tooltip: { enabled: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
            style: { colors: '#9ca3af', fontSize: '12px' }
        }
      },
      yaxis: {
        opposite: false,
        labels: {
            style: { colors: '#9ca3af' },
            formatter: (value) => value.toFixed(1)
        }
      },
      grid: {
        borderColor: '#f3f4f6',
        strokeDashArray: 4,
        padding: { top: 0, right: 0, bottom: 0, left: 10 }
      },
      tooltip: {
        theme: 'light',
        y: {
            formatter: function (val) { return val + " kg"; }
        },
        style: { fontSize: '12px' }
      }
    };
  }
}
