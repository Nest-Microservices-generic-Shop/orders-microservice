import { Controller, NotImplementedException, ParseUUIDPipe, Query } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from 'src/common/dto';
import { ChangeOrderStatusDto, PaidOrderDto } from './dto';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order:OrderWithProducts = await  this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);
    return {
      order,
      paymentSession
    }
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() paginationDto: OrderPaginationDto) {
    console.log("object")
    return this.ordersService.findAll(paginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern("changeOrderStatus")
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto){
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto){
    return this.ordersService.paidOrder(paidOrderDto);
  }
}
