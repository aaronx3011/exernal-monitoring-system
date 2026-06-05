import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TestingService } from './testing.service';
import { CreateTestDto } from './dto/create-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Testing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tests')
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  @Post()
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Create a new test definition' })
  async createTest(@Body() dto: CreateTestDto) {
    return this.testingService.createTest(dto.applicationId, dto);
  }

  @Get()
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'List test definitions' })
  @ApiQuery({ name: 'applicationId', required: false })
  async listTests(
    @Query('applicationId') applicationId?: string,
  ) {
    return this.testingService.listTests(applicationId);
  }

  @Get(':id')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get single test definition detail' })
  async getTest(@Param('id') id: string) {
    return this.testingService.getTest(id);
  }

  @Post(':id/run')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Trigger an on-demand test run' })
  async runTest(@Param('id') id: string) {
    return this.testingService.runTest(id, 'manual');
  }

  @Post(':id/abort')
  @Roles('admin', 'operator')
  @ApiOperation({ summary: 'Abort a running test' })
  async abortRun(@Param('id') id: string) {
    return this.testingService.abortRun(id);
  }

  @Get(':id/runs')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get run history for a test' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getRunHistory(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.testingService.getRunHistory(id, limit || 20, offset || 0);
  }

  @Get(':id/run/:runId')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Get a single test run detail' })
  async getRunDetail(
    @Param('id') id: string,
    @Param('runId') runId: string,
  ) {
    return this.testingService.getRunDetail(runId);
  }

  @Get(':id/comparison')
  @Roles('admin', 'operator', 'viewer')
  @ApiOperation({ summary: 'Compare last N test runs' })
  @ApiQuery({ name: 'lastN', required: false })
  async compareRuns(
    @Param('id') id: string,
    @Query('lastN') lastN?: number,
  ) {
    return this.testingService.compareRuns(id, lastN || 5);
  }
}
