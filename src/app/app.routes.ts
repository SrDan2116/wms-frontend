import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ProfileComponent } from './pages/profile/profile';
import { WeightTrackerComponent } from './pages/weight-tracker/weight-tracker';
import { TrainingComponent } from './pages/training/training';
import { RoutinesComponent } from './pages/routines/routines';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'weight', component: WeightTrackerComponent },
    { path: 'training', component: TrainingComponent },
    { path: 'routines', component: RoutinesComponent },
];
