import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination-dto";
import { OrderStatusList } from "src/orders/enums/order.enum";
import { OrderStatus } from "@prisma/client";


export class OrderPaginationDto extends PaginationDto{
    @IsOptional()
    @IsEnum(OrderStatusList,{
        message: `Valid status are ${OrderStatusList}}`
    })
    status: OrderStatus

}