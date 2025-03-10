/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoggingService } from './logger.service';
import { CreateLoggerDto } from './dto/create-logger.dto';
import { UpdateLoggerDto } from './dto/update-logger.dto';

@Controller('logger')
export class LoggerController {
  constructor(private readonly loggingService: LoggingService) {}

  @Post()
  create(@Body() createLoggerDto: CreateLoggerDto) {
    return this.loggingService.create(createLoggerDto);
  }

  @Get()
  findAll() {
    return this.loggingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loggingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoggerDto: UpdateLoggerDto) {
    return this.loggingService.update(+id, updateLoggerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loggingService.remove(+id);
  }
}
