import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event } from './event.schema';
import { v2 as cloudinary } from 'cloudinary';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      timeout: 60000,
    });
  }

  async uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; key: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'heyama-events',
        resource_type: 'auto',
        timeout: 60000,
       },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          key: result.public_id,
        });
      }
    );
    uploadStream.end(file.buffer);
  });
}

  async deleteFromCloudinary(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key);
  }

  async create(createEventDto: CreateEventDto, file: Express.Multer.File): Promise<Event> {
    const { url, key } = await this.uploadToCloudinary(file);

    const newEvent = new this.eventModel({
      ...createEventDto,
      imageUrl: url,
      imageKey: key,
    });

    return newEvent.save();
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Event | null> {
    return this.eventModel.findById(id).exec();
  }

  async remove(id: string): Promise<Event | null> {
    const event = await this.eventModel.findById(id);
    
    if (event) {
      await this.deleteFromCloudinary(event.imageKey);
      return this.eventModel.findByIdAndDelete(id).exec();
    }
    
    return null;
  }
}