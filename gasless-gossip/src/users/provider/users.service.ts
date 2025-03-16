import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { IUser, UserDocument } from 'src/modules/user/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AccountStatus } from 'src/modules/user/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(UserDocument.name) private userModel: Model<IUser>) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async signUp(createUserDto: CreateUserDto): Promise<any> {
    // Check if username or email already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ username: createUserDto.username }, { email: createUserDto.email }],
    });

    if (existingUser) {
      throw new HttpException('Username or email already exists', HttpStatus.CONFLICT);
    }

    // Create new user
    const newUser = new this.userModel({
      ...createUserDto,
      passwordHash: createUserDto.password,
      accountStatus: AccountStatus.PENDING,
    });

    console.log('newUser', newUser);

    const savedUser = await newUser.save();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, failedLoginAttempts, ...result } = savedUser.toObject(); // Remove password from the result object

    // Return user
    return result;
  }

  async findById(id: string): Promise<IUser> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async findByEmail(email: string): Promise<IUser> {
    const user = await this.userModel.findOne({ email }).select('+password').exec();

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user as IUser;
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('refreshTokens').exec();

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

    user.refreshTokens = [...user.refreshTokens.slice(-4), hashedRefreshToken];

    await user.save();
  }

  async verifyRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('refreshTokens').exec();

    if (!user) return false;

    return (
      await Promise.all(user.refreshTokens.map((token) => bcrypt.compare(refreshToken, token)))
    ).includes(true);
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: [] }).exec();
  }

  async resetFailedAttempts(userId: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { failedLoginAttempts: 0, lockUntil: null })
      .exec();
  }
}
