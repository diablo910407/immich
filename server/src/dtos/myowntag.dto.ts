import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ValidateUUID } from 'src/validation';

export class MyOwnTagTypeDto {
  @ValidateUUID()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class MyOwnTagSkillDto {
  @ValidateUUID()
  id!: string;

  @ValidateUUID()
  typeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class MyOwnTagLabelsDto {
  @IsArray()
  types!: MyOwnTagTypeDto[];

  @IsArray()
  skills!: MyOwnTagSkillDto[];
}