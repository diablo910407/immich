export interface PeoplePathAuditItemDto {
  id: string;
  name: string;
  paths: string[];
}

export type PeoplePathAuditResponseDto = PeoplePathAuditItemDto[];

