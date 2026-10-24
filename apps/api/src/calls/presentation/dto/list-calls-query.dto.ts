import { CALL_SORT_FIELDS, SORT_ORDERS } from '@rcm/contracts';
import type { CallSortField, ListCallsQuery, SortOrder } from '@rcm/contracts';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Query params arrive as text: "false" would otherwise be treated as a truthy string.
const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListCallsQueryDto implements ListCallsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @IsOptional() @IsString() @MaxLength(32)
  search?: string;

  @IsOptional() @IsString() @MaxLength(128)
  agent?: string;

  @IsOptional() @Transform(toBoolean) @IsBoolean()
  isSpam?: boolean;

  @IsOptional() @Transform(toBoolean) @IsBoolean()
  isRepeatCaller?: boolean;

  @IsOptional() @IsISO8601()
  from?: string;

  @IsOptional() @IsISO8601()
  to?: string;

  @IsOptional() @IsIn(CALL_SORT_FIELDS)
  sortBy?: CallSortField;

  @IsOptional() @IsIn(SORT_ORDERS)
  order?: SortOrder;
}
