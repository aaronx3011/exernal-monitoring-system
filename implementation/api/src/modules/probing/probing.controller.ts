import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProbingService } from './probing.service';
import { ProbeConfigDto } from './dto/probe-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Probing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('probing')
export class ProbingController {
  constructor(private readonly probingService: ProbingService) {}

  @Get(':appId/config')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get probe configuration for an application' })
  async getConfig(
    @Param('appId') appId: string,
    @CurrentUser() user: any,
  ) {
    return this.probingService.getProbeConfig(appId, user.orgId);
  }

  @Patch(':appId/config')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Update probe configuration for an application' })
  async updateConfig(
    @Param('appId') appId: string,
    @Body() dto: ProbeConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.probingService.updateProbeConfig(appId, user.orgId, dto);
  }

  @Post(':appId/probe-now')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Trigger an immediate probe' })
  async probeNow(
    @Param('appId') appId: string,
    @CurrentUser() user: any,
  ) {
    return this.probingService.triggerProbeNow(appId, user.orgId);
  }

  @Get(':appId/uptime')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get uptime statistics for an application' })
  async getUptime(
    @Param('appId') appId: string,
    @Query('period') period: string,
    @CurrentUser() user: any,
  ) {
    return this.probingService.calculateUptime(appId, user.orgId, period);
  }
}
