// src/modules/starknet/provider/dto/provider-config.dto.ts

import { IsEnum, IsString, IsUrl, IsOptional, IsNumber, IsPositive, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderType, StarkNetNetwork } from '../interfaces/provider-options.interface';

export class BaseProviderConfigDto {
  @IsEnum(ProviderType)
  type: ProviderType;

  @IsEnum(StarkNetNetwork)
  network: StarkNetNetwork;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  priority?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxRetries?: number = 3;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  timeout?: number = 30000; // 30 seconds default
}

export class RpcProviderConfigDto extends BaseProviderConfigDto {
  @IsUrl()
  nodeUrl: string;

  @IsString()
  @IsOptional()
  apiKey?: string;
}

export class SequencerProviderConfigDto extends BaseProviderConfigDto {
  @IsUrl()
  @IsOptional()
  baseUrl?: string;

  @IsUrl()
  @IsOptional()
  feederGatewayUrl?: string;

  @IsUrl()
  @IsOptional()
  gatewayUrl?: string;
}

export class InfuraProviderConfigDto extends BaseProviderConfigDto {
  @IsString()
  apiKey: string;
}

export class AlchemyProviderConfigDto extends BaseProviderConfigDto {
  @IsString()
  apiKey: string;
}

export class StarkNetProviderConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseProviderConfigDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: RpcProviderConfigDto, name: ProviderType.RPC },
        { value: SequencerProviderConfigDto, name: ProviderType.SEQUENCER },
        { value: InfuraProviderConfigDto, name: ProviderType.INFURA },
        { value: AlchemyProviderConfigDto, name: ProviderType.ALCHEMY },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  providers: (RpcProviderConfigDto | SequencerProviderConfigDto | InfuraProviderConfigDto | AlchemyProviderConfigDto)[];

  @IsEnum(StarkNetNetwork)
  defaultNetwork: StarkNetNetwork;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  cacheTimeToLive?: number = 60000; // 1 minute default

  @IsNumber()
  @IsOptional()
  @IsPositive()
  healthCheckInterval?: number = 60000; // 1 minute default
}

// src/modules/starknet/provider/dto/network-status.dto.ts

import { IsString, IsBoolean, IsDate, IsNumber, IsOptional } from 'class-validator';

export class NetworkStatusDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  chainId: string;

  @IsString()
  networkUrl: string;

  @IsString()
  explorerUrl: string;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isHealthy: boolean;

  @IsDate()
  lastCheckedAt: Date;

  @IsNumber()
  @IsOptional()
  blockHeight?: number;

  @IsNumber()
  @IsOptional()
  latency?: number; // in milliseconds

  @IsNumber()
  @IsOptional()
  successRate?: number; // percentage of successful requests

  @IsString()
  @IsOptional()
  currentProvider?: string; // Type of the current provider
}
