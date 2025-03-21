import { Injectable } from '@nestjs/common';
import { HashingProvider } from './hashing';
import * as bcrypt from 'bcrypt';

/**Bcryptprovider class */
@Injectable()
export class BcryptProvider implements HashingProvider {
    /**hashpassword class  */
    public async hashPassword(inpPassword: string | Buffer): Promise<string> {
        const saltRounds = 10
        const salt = await bcrypt.genSalt(saltRounds)
        
        return await bcrypt.hash(inpPassword, salt) 
    }

    /**compare passwords class with parameer of password and encrypassword*/
    public async comparePasswords(password: string, encryPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, encryPassword)
    }
}
