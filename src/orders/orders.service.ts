import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from 'src/common/dto';
import { ChangeOrderStatusDto } from './dto';
import { NATS_SERVICE } from 'src/config/services';
import { catchError, firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { PaidOrderDto } from './dto/paid-order.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit{

  private readonly logguer  = new Logger();

  constructor(
    @Inject(NATS_SERVICE) 
    private readonly client:ClientProxy
  ){
    super();
  }

  async onModuleInit() {
      await this.$connect();
      this.logguer.log("Database connected")
  }

  async create(createOrderDto: CreateOrderDto) {
    

    try{
      const ids = createOrderDto.items.map(prod => prod.productId)
      const products = await firstValueFrom(
        this.client.send({cmd: 'validate_products'},ids)
      );

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find((product) => product.id === orderItem.productId)
        .price;

        return price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem)=>{
         return acc + orderItem.quantity
      },0)

      const order = await this.order.create({
        data:{
          totalAmount,
          totalItems,
          OrderItem:{
            createMany:{
                data: createOrderDto.items.map((item) => ({
                  price: products.find(product => product.id ===item.productId).price,
                  productId: item.productId,
                  quantity: item.quantity
                }))
            }
          }
        },
        include:{
          OrderItem: {
            select:{
              price:true,
              quantity: true,
              productId: true,
            }
          }
        }
      });
      


      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem => ({
          ...orderItem,
          name: products.find(product => product.id === orderItem.productId).name
        })))
      };
    }catch(err){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST, 
          message: "Chec logs"
      });
    }

    

  }

  async findAll(paginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where:{
        status: paginationDto.status
      }
    });

    const currentPage = paginationDto.page;
    const perPage = paginationDto.limit;


    return {
      data: await this.order.findMany({
        skip: (currentPage -1) * perPage,
        take: perPage,
        where:{
          status: paginationDto.status
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage)
      }
    }
  }

  async findOne(id: string) { 

    const order = await  this.order.findFirst({
      where:{id},
      include: {
        OrderItem:true
      }
    },
    );
    if(!order){ 
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message:`Order with id ${id} not exist`
      });
    }

    const ids =  order.OrderItem.map(orderItem => orderItem.productId);
    const products = await firstValueFrom(
      this.client.send({cmd: 'validate_products'},ids)
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        name: products.find(product => product.id === orderItem.productId).name
      }))
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto){
    const {id, status} = changeOrderStatusDto;

    const order = await this.findOne(id);
    if(order.status === status){
      return order;
    }

    return this.order.update({
      where: {id},
      data: {
        status
      }
    });
  }


  async createPaymentSession(order: OrderWithProducts){
 
    const paymentsSession = await firstValueFrom(
      this.client.send('create.payments.session',{
        orderId: order.id,
        currency: 'mxn',
        items:order.OrderItem.map(item =>{
          return {
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }
        })
      })
    )

    return paymentsSession;
  }
  

  async paidOrder(paidOrderdto: PaidOrderDto){
    this.logguer.log("order paid", paidOrderdto)

    await this.order.update({
      where:{id: paidOrderdto.orderId},
      data:{
        status: 'PAID', 
        paid:true, 
        paidAt: new Date(), 
        stripeChargeId: paidOrderdto.stripePaymentId,
        OrderReceipt:{
          create:{
            receiptUrl: paidOrderdto.receiptUrl
          }
        }
      },
    });

    return;
  }
}
