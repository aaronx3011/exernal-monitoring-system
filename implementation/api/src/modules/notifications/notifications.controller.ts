import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { SilenceDto } from './dto/silence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('alert-rules')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Create an alert rule' })
  async createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.notificationsService.createAlertRule(dto);
  }

  @Get('alert-rules')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'List alert rules' })
  @ApiQuery({ name: 'applicationId', required: false })
  async listAlertRules(@Query('applicationId') applicationId?: string) {
    return this.notificationsService.listAlertRules(applicationId);
  }

  @Patch('alert-rules/:id')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Update an alert rule' })
  async updateAlertRule(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAlertRuleDto>,
  ) {
    return this.notificationsService.updateAlertRule(id, dto);
  }

  @Delete('alert-rules/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an alert rule' })
  async deleteAlertRule(@Param('id') id: string) {
    return this.notificationsService.deleteAlertRule(id);
  }

  @Get('alerts')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get alert timeline' })
  async getAlertTimeline() {
    return this.notificationsService.getAlertTimeline();
  }

  @Post('notifications/test')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Send a test notification to configured webhook' })
  async sendTestNotification(@Body('webhookUrl') webhookUrl?: string) {
    return this.notificationsService.sendTestNotification(webhookUrl);
  }

  @Post('alert-rules/:id/silence')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Add a silence/maintenance window to an alert rule' })
  async silenceRule(
    @Param('id') id: string,
    @Body() dto: SilenceDto,
  ) {
    return this.notificationsService.silenceRule(id, dto);
  }
}
