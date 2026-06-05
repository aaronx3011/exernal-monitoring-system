import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateKeyDto } from './dto/create-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Registration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('applications')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Create a new application and generate API key' })
  async createApplication(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.registrationService.createApp(dto, user.id, user.orgId);
  }

  @Get('applications')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'List applications with optional filters' })
  @ApiQuery({ name: 'environment', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listApplications(
    @CurrentUser() user: any,
    @Query('environment') environment?: string,
    @Query('tag') tag?: string,
    @Query('status') status?: string,
  ) {
    return this.registrationService.listApplications(user.orgId, { environment, tag, status });
  }

  @Get('applications/:id')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get single application detail' })
  async getApplication(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.registrationService.getApplication(id, user.orgId);
  }

  @Post('applications/:id/keys')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Generate a new API key for an application' })
  async createKey(
    @Param('id') id: string,
    @Body() dto: CreateKeyDto,
    @CurrentUser() user: any,
  ) {
    await this.registrationService.getApplication(id, user.orgId);
    return this.registrationService.generateKey(id, dto.label);
  }

  @Post('keys/:id/rotate')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Rotate an API key (revoke old, create new)' })
  async rotateKey(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.registrationService.rotateKey(id, user.id);
  }

  @Delete('keys/:id')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeKey(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.registrationService.revokeKey(id, user.id);
  }

  @Post('applications/:id/check-connectivity')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Check connectivity to the application health endpoint' })
  async checkConnectivity(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.registrationService.checkConnectivity(id, user.orgId);
  }
}
