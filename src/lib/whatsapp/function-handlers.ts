import { servicesService } from '@/services/services';
import { appointmentsService } from '@/services/appointments';
import { loyaltyService } from '@/services/loyalty';
import { promosService } from '@/services/promos';
import { customersService } from '@/services/customers';
import { getAdminClient } from '@/lib/supabase';

export async function handleFunctionCall(name: string, args: any, customerPhone: string) {
    console.log(`Executing function: ${name}`, args);

    // 1. Identify Customer
    const customer = await customersService.getCustomerByPhone(customerPhone);

    switch (name) {
        case "get_services":
            try {
                const services = await servicesService.getServices();
                const category = args.category;
                const filtered = category
                    ? services.filter(s => s.category?.toLowerCase() === category.toLowerCase())
                    : services;

                return filtered.map(s => ({
                    id: s.id,
                    name: s.name,
                    price: s.price,
                    duration: s.duration,
                    category: s.category
                }));
            } catch (error: any) {
                return { error: error.message };
            }

        case "get_available_slots":
            try {
                const { date, service_id } = args;
                const service = await servicesService.getServiceById(service_id);
                const duration = service?.duration || 60;

                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.salonflow.space';
                const res = await fetch(`${baseUrl}/api/public/consolidated-availability?date=${date}&service_id=${service_id}&duration=${duration}`);
                const data = await res.json();

                return {
                    date,
                    slots: data.slots || [],
                    message: data.slots?.length > 0 ? "Available slots found." : "No slots available for this date."
                };
            } catch (error: any) {
                return { error: error.message };
            }

        case "send_booking_link":
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.salonflow.space';
            return {
                status: "SUCCESS",
                url: baseUrl,
                message: "Please tell the user to visit this link to book their appointment."
            };

        case "get_customer_appointments":
            try {
                if (!customer) return { message: "No customer profile found for this number." };

                const appointments = await appointmentsService.getAppointments();

                // Filter for this customer and upcoming
                const filtered = appointments
                    .filter((a: any) => a.customer_id === customer.id && (a.status === 'Pending' || a.status === 'Confirmed'))
                    .sort((a: any, b: any) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

                return filtered.map((a: any) => ({
                    id: a.id,
                    date: a.appointment_date,
                    time: a.start_time,
                    status: a.status,
                    service: a.services_details?.[0]?.name || "Service"
                }));
            } catch (error: any) {
                return { error: error.message };
            }


        case "get_loyalty_info":
            try {
                if (!customer) return { message: "No loyalty profile found." };
                const loyaltyInfo = await loyaltyService.getCustomerLoyaltyInfo(customer.id);
                return {
                    points: loyaltyInfo.availablePoints,
                    pointsValue: loyaltyInfo.pointsValue,
                    cardValid: loyaltyInfo.cardValid,
                    totalVisits: loyaltyInfo.totalVisits,
                    eligibleForReward: loyaltyInfo.eligibleForVisitReward,
                    nextRewardAt: loyaltyInfo.nextRewardVisit
                };
            } catch (error: any) {
                return { error: error.message };
            }

        case "check_promo_code":
            try {
                const { code } = args;
                const promos = await promosService.getPromoCodes({ isActive: true });
                const promo = promos.find(p => p.code.toUpperCase() === code.toUpperCase());

                if (!promo) return { valid: false, message: "Invalid or expired promo code." };

                return {
                    valid: true,
                    type: promo.type,
                    value: promo.value,
                    description: promo.description,
                    minSpend: promo.min_spend
                };
            } catch (error: any) {
                return { error: error.message };
            }

        case "save_user_preference":
            try {
                const { key, value } = args;
                if (!key || !value) return { error: "Key or value missing." };
                
                const supabase = getAdminClient();
                const { data: session } = await supabase
                    .from('bot_sessions')
                    .select('context')
                    .eq('phone_number', customerPhone)
                    .single();
                
                const currentContext = session?.context || {};
                currentContext[key] = value;
                
                await supabase
                    .from('bot_sessions')
                    .update({ context: currentContext })
                    .eq('phone_number', customerPhone);
                    
                return { status: "Saved to long term memory" };
            } catch (error: any) {
                return { error: error.message };
            }

        default:
            return { error: `Function ${name} not found.` };
    }
}
