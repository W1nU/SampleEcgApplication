/*
 * SPDX-License-Identifier: Apache-2.0
 */
// Deterministic JSON.stringify()
import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
import { DataStructure } from "./dataStructure";

@Info({
  title: "HealthStorage",
  description: "Smart contract for storing health data",
})
export class HealthStorage extends Contract {
  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const datas: DataStructure[] = [];
  }

  @Transaction()
  public async PushData(
    ctx: Context,
    id: string,
    name: string,
    birthday: string,
    data: string,
    dataType: string,
    dataCreatedAt: string,
    createdAt: string
  ): Promise<void> {
    const exists = await this.DataExists(ctx, id);

    if (exists) {
      throw new Error(`The asset ${id} already exists`);
    }

    const newData: DataStructure = {
      ID: id,
      Name: name,
      Birthday: birthday,
      Data: data,
      DataType: dataType,
      DataCreatedAt: dataCreatedAt,
      CreatedAt: createdAt,
    };

    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(newData)))
    );
  }

  @Transaction(false)
  public async ReadData(ctx: Context, id: string): Promise<string> {
    const dataJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!dataJSON || dataJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return dataJSON.toString();
  }

  @Transaction()
  public async UpdateData(
    ctx: Context,
    id: string,
    name: string,
    birthday: string,
    data: string,
    dataType: string,
    dataCreatedAt: string
  ): Promise<void> {
    const exists = await this.DataExists(ctx, id);

    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    const updatedData: DataStructure = {
      ID: id,
      Name: name,
      Birthday: birthday,
      Data: data,
      DataType: dataType,
      DataCreatedAt: dataCreatedAt,
    };

    return ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(updatedData)))
    );
  }

  @Transaction()
  public async DeleteData(ctx: Context, id: string): Promise<void> {
    const exists = await this.DataExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return ctx.stub.deleteState(id);
  }

  @Transaction(false)
  @Returns("boolean")
  public async DataExists(ctx: Context, id: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  @Transaction(false)
  @Returns("string")
  public async GetAllData(ctx: Context): Promise<string> {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  @Transaction(false)
  @Returns("string")
  public async Test(ctx: Context): Promise<string> {
    return "Hello World!";
  }
}
