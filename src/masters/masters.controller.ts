import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Ip,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { MasterListQueryDto } from './dto/master-list-query.dto';
import { ParameterListQueryDto } from './dto/parameter-list-query.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { CreateParameterDto, UpdateParameterDto } from './dto/parameter.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserType } from '../common/constants/user-types';
import { HrWriteGuard } from '../common/guards/hr-write.guard';

@ApiTags('Masters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HrWriteGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  private okEnvelope(data: any, text: string, pagination?: any) {
    return { data, message: { code: 'OK', text }, pagination };
  }

  // ==================== Sites ====================
  @Get('sites')
  async sites(@Query() query: MasterListQueryDto) {
    const result = await this.mastersService.findAllSites(query);
    return this.okEnvelope(result.items, 'Sites retrieved', result.pagination);
  }

  @Post('sites')
  async createSite(
    @Body() dto: CreateSiteDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.mastersService.createSite(dto, user.profileId, ip);
    return this.okEnvelope(created, 'Site created');
  }

  @Get('sites/:id')
  async site(@Param('id', ParseIntPipe) id: number) {
    const item = await this.mastersService.findOneSite(id);
    return this.okEnvelope(item, 'Site retrieved');
  }

  @Patch('sites/:id')
  async updateSite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.updateSite(id, dto, user.profileId, ip);
    return this.okEnvelope(updated, 'Site updated');
  }

  @Delete('sites/:id')
  async removeSite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.removeSite(id, user.profileId, ip);
    return this.okEnvelope(updated, 'Site deactivated');
  }

  @Delete('sites/:id/permanent')
  async deleteSite(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    await this.mastersService.deleteSite(id, user.profileId, ip);
    return this.okEnvelope(null, 'Site deleted');
  }

  // ==================== Languages ====================
  @Get('languages')
  async languages(@Query() query: MasterListQueryDto) {
    const result = await this.mastersService.findAllLanguages(query);
    return this.okEnvelope(result.items, 'Languages retrieved', result.pagination);
  }

  @Post('languages')
  async createLanguage(
    @Body() dto: CreateLanguageDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.mastersService.createLanguage(dto, user.profileId, ip);
    return this.okEnvelope(created, 'Language created');
  }

  @Get('languages/:id')
  async language(@Param('id', ParseIntPipe) id: number) {
    const item = await this.mastersService.findOneLanguage(id);
    return this.okEnvelope(item, 'Language retrieved');
  }

  @Patch('languages/:id')
  async updateLanguage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLanguageDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.updateLanguage(id, dto, user.profileId, ip);
    return this.okEnvelope(updated, 'Language updated');
  }

  @Delete('languages/:id')
  async removeLanguage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.removeLanguage(id, user.profileId, ip);
    return this.okEnvelope(updated, 'Language deactivated');
  }

  // ==================== Shifts ====================
  @Delete('languages/:id/permanent')
  async deleteLanguage(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    await this.mastersService.deleteLanguage(id, user.profileId, ip);
    return this.okEnvelope(null, 'Language deleted');
  }

  @Get('shifts')
  async shifts(@Query() query: MasterListQueryDto) {
    const result = await this.mastersService.findAllShifts(query);
    return this.okEnvelope(result.items, 'Shifts retrieved', result.pagination);
  }

  @Post('shifts')
  async createShift(
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.mastersService.createShift(dto, user.profileId, ip);
    return this.okEnvelope(created, 'Shift created');
  }

  @Get('shifts/:id')
  async shift(@Param('id', ParseIntPipe) id: number) {
    const item = await this.mastersService.findOneShift(id);
    return this.okEnvelope(item, 'Shift retrieved');
  }

  @Patch('shifts/:id')
  async updateShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.updateShift(id, dto, user.profileId, ip);
    return this.okEnvelope(updated, 'Shift updated');
  }

  @Delete('shifts/:id')
  async removeShift(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.removeShift(id, user.profileId, ip);
    return this.okEnvelope(updated, 'Shift deactivated');
  }

  // ==================== Document Types ====================
  @Delete('shifts/:id/permanent')
  async deleteShift(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    await this.mastersService.deleteShift(id, user.profileId, ip);
    return this.okEnvelope(null, 'Shift deleted');
  }

  @Get('document-types')
  async documentTypes(@Query() query: MasterListQueryDto) {
    const result = await this.mastersService.findAllDocumentTypes(query);
    return this.okEnvelope(result.items, 'Document types retrieved', result.pagination);
  }

  @Post('document-types')
  async createDocumentType(
    @Body() dto: CreateDocumentTypeDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.mastersService.createDocumentType(dto, user.profileId, ip);
    return this.okEnvelope(created, 'Document type created');
  }

  @Get('document-types/:id')
  async documentType(@Param('id', ParseIntPipe) id: number) {
    const item = await this.mastersService.findOneDocumentType(id);
    return this.okEnvelope(item, 'Document type retrieved');
  }

  @Patch('document-types/:id')
  async updateDocumentType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentTypeDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.updateDocumentType(id, dto, user.profileId, ip);
    return this.okEnvelope(updated, 'Document type updated');
  }

  @Delete('document-types/:id')
  async removeDocumentType(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.mastersService.removeDocumentType(id, user.profileId, ip);
    return this.okEnvelope(updated, 'Document type deactivated');
  }

  @Delete('document-types/:id/permanent')
  async deleteDocumentType(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    await this.mastersService.deleteDocumentType(id, user.profileId, ip);
    return this.okEnvelope(null, 'Document type deleted');
  }

  // ==================== Parameters ====================
  @Get('parameter-types')
  async parameterTypes() {
    const items = await this.mastersService.findAllParameterTypes();
    return this.okEnvelope(items, 'Parameter types retrieved');
  }

  @Post('parameters')
  @UseGuards(RolesGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async createParameter(@Body() dto: CreateParameterDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.okEnvelope(await this.mastersService.createParameter(dto, user.profileId, ip), 'Parameter created');
  }

  @Delete('parameters/:id/permanent')
  @UseGuards(RolesGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async deleteParameter(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    await this.mastersService.deleteParameter(id, user.profileId, ip);
    return this.okEnvelope(null, 'Option deleted');
  }

  @Patch('parameters/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async updateParameter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParameterDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.okEnvelope(await this.mastersService.updateParameter(id, dto, user.profileId, ip), 'Parameter updated');
  }

  @Get('parameters')
  async parameters(@Query() query: ParameterListQueryDto) {
    const result = await this.mastersService.findAllParameters(query);
    return this.okEnvelope(result.items, 'Parameters retrieved', result.pagination);
  }

  // ==================== Metadata definitions ====================
  @Get('form-definitions')
  async formDefinitions() {
    const items = await this.mastersService.findAllFormDefinitions();
    return this.okEnvelope(items, 'Form definitions retrieved');
  }

  @Get('form-definitions/:key')
  async formDefinition(@Param('key') key: string) {
    const item = await this.mastersService.findOneFormDefinition(key);
    return this.okEnvelope(item, 'Form definition retrieved');
  }

  @Get('form-definitions/:key/fields')
  async formFields(@Param('key') key: string) {
    const items = await this.mastersService.findFormFields(key);
    return this.okEnvelope(items, 'Form fields retrieved');
  }
}
