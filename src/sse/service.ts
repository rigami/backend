import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MessageEvent } from '@/sse/entities/messageEvent';

@Injectable()
export class SSEService {
    private readonly logger = new Logger(SSEService.name);
    private events = new Map<string, Subject<MessageEvent>>();

    addEvent(queue: string, userId: string, event) {
        this.events.get(`${userId}[${queue}]`).next({ data: event });
    }

    createQueue(queue: string, userId: string) {
        const subject = new Subject<MessageEvent>();

        this.events.set(`${userId}[${queue}]`, subject);

        return subject.asObservable();
    }

    closeQueue(queue: string, userId: string) {
        if (!this.events.has(`${userId}[${queue}]`)) return;

        this.events.get(`${userId}[${queue}]`).complete();

        this.events.delete(`${userId}[${queue}]`);
    }
}
