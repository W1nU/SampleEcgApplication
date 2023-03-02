/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class DataStructure {
  @Property()
  public ID: string;

  @Property()
  public Name: string;

  @Property()
  public Birthday: string;

  @Property()
  public CreatedAt?: string;

  @Property()
  public DataCreatedAt: string;

  @Property()
  public Data: string;

  @Property()
  public DataType: string;
}
