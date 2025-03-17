import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
    HttpStatus,
    HttpCode,
    BadRequestException,
  } from '@nestjs/common';
  import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { ContactsService } from './contacts.service';
  import { CreateContactDto } from './dto/create-contact.dto';
  import { UpdateContactDto } from './dto/update-contact.dto';
  import { CreateContactGroupDto } from './dto/create-contact-group.dto';
  import { UpdateContactGroupDto } from './dto/update-contact-group.dto';
  import { ContactResponseDto } from './dto/contact-response.dto';
  import { ContactGroupResponseDto } from './dto/contact-group-response.dto';
  import { ContactStatus } from './enums/contact-status.enum';
  
  @ApiTags('contacts')
  @Controller('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new contact' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Contact created successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Contact already exists' })
    async createContact(
      @Request() req,
      @Body() createContactDto: CreateContactDto,
    ): Promise<ContactResponseDto> {
      return this.contactsService.createContact(req.user.userId, createContactDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all contacts' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
    @ApiQuery({ name: 'group', required: false, description: 'Filter by group ID' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by status', enum: ContactStatus })
    @ApiQuery({ name: 'favorite', required: false, description: 'Filter favorites', type: Boolean })
    @ApiQuery({ name: 'search', required: false, description: 'Search by nickname or notes' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contacts retrieved successfully' })
    async getContacts(
      @Request() req,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
      @Query('group') group?: string,
      @Query('status') status?: ContactStatus,
      @Query('favorite') favorite?: boolean,
      @Query('search') search?: string,
    ): Promise<{ contacts: ContactResponseDto[], total: number, page: number, pages: number }> {
      // Validate pagination parameters
      if (page && page < 1) {
        throw new BadRequestException('Page must be greater than or equal to 1');
      }
      
      if (limit && (limit < 1 || limit > 100)) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      
      return this.contactsService.getContacts(
        req.user.userId,
        page ? parseInt(String(page), 10) : 1,
        limit ? parseInt(String(limit), 10) : 20,
        group,
        status,
        favorite === undefined ? undefined : favorite === true || favorite === 'true',
        search,
      );
    }
  
    @Get('blocked')
    @ApiOperation({ summary: 'Get blocked contacts' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Blocked contacts retrieved successfully' })
    async getBlockedContacts(
      @Request() req,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ): Promise<{ contacts: ContactResponseDto[], total: number, page: number, pages: number }> {
      return this.contactsService.getBlockedContacts(
        req.user.userId,
        page ? parseInt(String(page), 10) : 1,
        limit ? parseInt(String(limit), 10) : 20,
      );
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a contact by ID' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contact retrieved successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
    async getContact(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ContactResponseDto> {
      return this.contactsService.getContact(req.user.userId, id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a contact' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contact updated successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    async updateContact(
      @Request() req,
      @Param('id') id: string,
      @Body() updateContactDto: UpdateContactDto,
    ): Promise<ContactResponseDto> {
      return this.contactsService.updateContact(req.user.userId, id, updateContactDto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a contact' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Contact deleted successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
    async deleteContact(
      @Request() req,
      @Param('id') id: string,
    ): Promise<void> {
      return this.contactsService.deleteContact(req.user.userId, id);
    }
  
    @Post(':id/block')
    @ApiOperation({ summary: 'Block a contact' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contact blocked successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
    async blockContact(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ContactResponseDto> {
      return this.contactsService.blockContact(req.user.userId, id);
    }
  
    @Post(':id/unblock')
    @ApiOperation({ summary: 'Unblock a contact' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contact unblocked successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
    async unblockContact(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ContactResponseDto> {
      return this.contactsService.unblockContact(req.user.userId, id);
    }
    
    // Contact Group endpoints
    
    @Post('groups')
    @ApiOperation({ summary: 'Create a new contact group' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Group created successfully', type: ContactGroupResponseDto })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Group already exists' })
    async createContactGroup(
      @Request() req,
      @Body() createContactGroupDto: CreateContactGroupDto,
    ): Promise<ContactGroupResponseDto> {
      return this.contactsService.createContactGroup(req.user.userId, createContactGroupDto);
    }
  
    @Get('groups')
    @ApiOperation({ summary: 'Get all contact groups' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Groups retrieved successfully', type: [ContactGroupResponseDto] })
    async getContactGroups(
      @Request() req,
    ): Promise<ContactGroupResponseDto[]> {
      return this.contactsService.getContactGroups(req.user.userId);
    }
  
    @Get('groups/:id')
    @ApiOperation({ summary: 'Get a contact group by ID' })
    @ApiParam({ name: 'id', description: 'Group ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Group retrieved successfully', type: ContactGroupResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
    async getContactGroup(
      @Request() req,
      @Param('id') id: string,
    ): Promise<ContactGroupResponseDto> {
      return this.contactsService.getContactGroup(req.user.userId, id);
    }
  
    @Patch('groups/:id')
    @ApiOperation({ summary: 'Update a contact group' })
    @ApiParam({ name: 'id', description: 'Group ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Group updated successfully', type: ContactGroupResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
    async updateContactGroup(
      @Request() req,
      @Param('id') id: string,
      @Body() updateContactGroupDto: UpdateContactGroupDto,
    ): Promise<ContactGroupResponseDto> {
      return this.contactsService.updateContactGroup(req.user.userId, id, updateContactGroupDto);
    }
  
    @Delete('groups/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a contact group' })
    @ApiParam({ name: 'id', description: 'Group ID' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Group deleted successfully' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
    async deleteContactGroup(
      @Request() req,
      @Param('id') id: string,
    ): Promise<void> {
      return this.contactsService.deleteContactGroup(req.user.userId, id);
    }
  
    @Post(':contactId/groups/:groupId')
    @ApiOperation({ summary: 'Add a contact to a group' })
    @ApiParam({ name: 'contactId', description: 'Contact ID' })
    @ApiParam({ name: 'groupId', description: 'Group ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contact added to group successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact or group not found' })
    async addContactToGroup(
      @Request() req,
      @Param('contactId') contactId: string,
      @Param('groupId') groupId: string,
    ): Promise<ContactResponseDto> {
      return this.contactsService.addContactToGroup(req.user.userId, contactId, groupId);
    }
  
    @Delete(':contactId/groups/:groupId')
    @ApiOperation({ summary: 'Remove a contact from a group' })
    @ApiParam({ name: 'contactId', description: 'Contact ID' })
    @ApiParam({ name: 'groupId', description: 'Group ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Contact removed from group successfully', type: ContactResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
    async removeContactFromGroup(
      @Request() req,
      @Param('contactId') contactId: string,
      @Param('groupId') groupId: string,
    ): Promise<ContactResponseDto> {
      return this.contactsService.removeContactFromGroup(req.user.userId, contactId, groupId);
    }
  }