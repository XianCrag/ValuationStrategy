import { NextRequest, NextResponse } from 'next/server';
import { dailyCache } from '@/lib/cache';

/**
 * GET /api/cache - 获取缓存统计信息
 */
export async function GET() {
  try {
    const stats = dailyCache.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get cache stats',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache - 清除缓存
 * 支持两种模式：
 * - 清除所有缓存: DELETE /api/cache
 * - 清除指定缓存: DELETE /api/cache?key=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // 清除指定缓存
      const deleted = dailyCache.delete(key);
      return NextResponse.json({
        success: true,
        message: deleted ? 'Cache entry deleted' : 'Cache entry not found',
        deleted,
      });
    } else {
      // 清除所有缓存
      dailyCache.clear();
      return NextResponse.json({
        success: true,
        message: 'All cache cleared',
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to clear cache',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/cleanup - 手动触发过期缓存清理
 */
export async function POST() {
  try {
    dailyCache.cleanup();
    const stats = dailyCache.getStats();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      stats,
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to cleanup cache',
        success: false 
      },
      { status: 500 }
    );
  }
}

