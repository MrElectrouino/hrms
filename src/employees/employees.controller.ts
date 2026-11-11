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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserType } from '../common/constants/user-types';
import { PHOTO_MAX_BYTES } from './employees.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { CreateDependantDto } from './dto/create-dependant.dto';
import { UpdateDependantDto } from './dto/update-dependant.dto';
import { UploadedFileLike } from '../common/services/file-storage.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  private okEnvelope(data: any, text: string, pagination?: any) {
    return { data, message: { code: 'OK', text }, pagination };
  }

  @Get()
  async findAll(@Query() query: ListEmployeesQueryDto) {
    const result = await this.employeesService.findAll(query);
    return this.okEnvelope(result.items, 'Employees retrieved', result.pagination);
  }

  @Post()
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.employeesService.create(dto, user.profileId, ip);
    return this.okEnvelope(created, 'Employee created');
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.employeesService.findOne(id);
    return this.okEnvelope(item, 'Employee retrieved');
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.employeesService.update(id, dto, user.profileId, ip);
    return this.okEnvelope(updated, 'Employee updated');
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.employeesService.remove(id, user.profileId, ip);
    return this.okEnvelope(updated, 'Employee deactivated');
  }

  /** HR Admin and System Admin only. JPEG/PNG up to 10 MB (BR-MD-09). */
  @Post(':id/photo')
  @UseGuards(RolesGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PHOTO_MAX_BYTES, files: 1 } }))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedFileLike,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    if (!file) {
      throw new BadRequestException('Choose a photo to upload');
    }
    const result = await this.employeesService.uploadPhoto(id, file, user.profileId, ip);
    return this.okEnvelope(
      { fileId: result.fileId.toString(), originalName: result.originalName, mimeType: result.mimeType },
      'Photo uploaded',
    );
  }

  /** The employee themself, HR Admin or System Admin. Never cached by shared caches. */
  @Get(':id/photo')
  async getPhoto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const isHr = [UserType.SystemAdmin, UserType.HRAdmin].includes(user.userTypeId);
    if (!isHr && (await this.employeesService.profileIdOf(id)) !== user.profileId) {
      throw new ForbiddenException('You can only view your own photo');
    }
    const { stream, mimeType, sizeBytes } = await this.employeesService.getPhotoStream(id);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (sizeBytes !== null && sizeBytes !== undefined) res.setHeader('Content-Length', sizeBytes.toString());
    stream.pipe(res);
  }

  @Get(':id/dependants')
  async findDependants(@Param('id', ParseIntPipe) id: number) {
    const items = await this.employeesService.findDependants(id);
    return this.okEnvelope(items, 'Dependants retrieved');
  }

  @Post(':id/dependants')
  async createDependant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDependantDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.employeesService.createDependant(id, dto, user.profileId, ip);
    return this.okEnvelope(created, 'Dependant created');
  }

  @Get(':id/dependants/:dependantId')
  async findOneDependant(
    @Param('id', ParseIntPipe) _employeeId: number,
    @Param('dependantId', ParseIntPipe) dependantId: number,
  ) {
    // Service method not exposed; reuse list or add later.
    return this.okEnvelope({ id: dependantId }, 'Dependant detail not yet implemented');
  }

  @Patch(':id/dependants/:dependantId')
  async updateDependant(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependantId', ParseIntPipe) dependantId: number,
    @Body() dto: UpdateDependantDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.employeesService.updateDependant(id, dependantId, dto, user.profileId, ip);
    return this.okEnvelope(updated, 'Dependant updated');
  }

  @Delete(':id/dependants/:dependantId')
  async removeDependant(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependantId', ParseIntPipe) dependantId: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    await this.employeesService.removeDependant(id, dependantId, user.profileId, ip);
    return this.okEnvelope(null, 'Dependant deleted');
  }
}
