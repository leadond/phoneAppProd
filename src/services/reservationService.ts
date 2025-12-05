import cron from 'node-cron';
import { dataService } from './dataService';

class ReservationService {
  private static instance: ReservationService;

  private constructor() {
    this.init();
  }

  public static getInstance(): ReservationService {
    if (!ReservationService.instance) {
      ReservationService.instance = new ReservationService();
    }
    return ReservationService.instance;
  }

  private init() {
    // Schedule a job to run every hour to check for expired reservations
    cron.schedule('0 * * * *', () => {
      this.releaseExpiredReservations();
    });
  }

  public async releaseExpiredReservations() {
    console.log('Checking for expired reservations...');
    const phoneNumbers = await dataService.getPhoneNumbers();
    const now = new Date();

    for (const number of phoneNumbers) {
      if (number.status === 'reserved' && number.reservedUntil) {
        const reservedUntil = new Date(number.reservedUntil);
        if (now > reservedUntil) {
          await dataService.updatePhoneNumber(number.id, {
            status: 'available',
            reservedUntil: null,
            project: null,
          });
          console.log(`Released expired reservation for number: ${number.number}`);
        }
      }
    }
    console.log('Finished checking for expired reservations.');
  }
}

export const reservationService = ReservationService.getInstance();
