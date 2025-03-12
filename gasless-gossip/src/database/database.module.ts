import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('MongoDB connection established');
          });
          connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
          });
          connection.on('error', (error: any) => {
            console.error('MongoDB connection error:', error);
          });
          return connection;
        },
        retryAttempts: 5,
        retryDelay: 3000,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Connection pooling
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
