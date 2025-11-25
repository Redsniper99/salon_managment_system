import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
}

export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateDuration(services: any[], servicesData: any[]): number {
    return services.reduce((total, serviceId) => {
        const service = servicesData.find(s => s.id === serviceId);
        return total + (service?.duration || 0);
    }, 0);
}

export function addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

export function isTimeOverlap(
    start1: string,
    duration1: number,
    start2: string,
    duration2: number
): boolean {
    const [h1, m1] = start1.split(':').map(Number);
    const [h2, m2] = start2.split(':').map(Number);

    const start1Mins = h1 * 60 + m1;
    const end1Mins = start1Mins + duration1;
    const start2Mins = h2 * 60 + m2;
    const end2Mins = start2Mins + duration2;

    return (start1Mins < end2Mins && end1Mins > start2Mins);
}
