import { describe, expect, it } from 'vitest';
import { profileMediaIdentity } from '@/app/services/profile/profileMediaIdentity';

describe('profileMediaIdentity', () => {
    it('يتجاهل query التوقيع لنفس المسار', () => {
        const a = profileMediaIdentity('https://cdn.example/p/avatar.jpg?token=aaa&exp=1');
        const b = profileMediaIdentity('https://cdn.example/p/avatar.jpg?token=bbb&exp=2');
        expect(a).toBe(b);
        expect(a).toContain('/p/avatar.jpg');
    });

    it('يميّز مسارات مختلفة', () => {
        expect(profileMediaIdentity('https://cdn.example/a.jpg')).not.toBe(
            profileMediaIdentity('https://cdn.example/b.jpg'),
        );
    });

    it('لا يستخدم data URL الكامل كمفتاح', () => {
        const dataUrl =
            'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFhUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EADkQAAIBAgQDBgQGAwEAAAAAAAECAwQRAAUSITFBBhMiUWFxMoGRoRQjQrHB0fAVYnKS4f/EABkBAAMBAQEAAAAAAAAAAAAAAAABAgMEBf/EACIRAAICAQQCAwEAAAAAAAAAAAABAhEDIRIxBEFREyJhcYH/2gAMAwEAAhEDEQA/APfKKACiiigAooooAKKKKACiiigD/9k=';
        const id = profileMediaIdentity(dataUrl);
        expect(id.length).toBeLessThan(200);
        expect(id.startsWith('data:image/jpeg;base64')).toBe(true);
        expect(id.includes('/9j/')).toBe(false);
    });
});
